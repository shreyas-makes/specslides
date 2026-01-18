package codex

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type GenerateOptions struct {
	InputPath string
	ServerURL string
	DryRun    bool
}

type ExtractResult struct {
	Extract  PromptExtract
	JSON     string
	Markdown string
}

type PromptExtract struct {
	SchemaVersion string          `json:"schemaVersion"`
	Source        string          `json:"source"`
	Session       PromptSession   `json:"session"`
	Prompts       []PromptMessage `json:"prompts"`
}

type PromptSession struct {
	ID            string `json:"id"`
	CreatedAt     string `json:"createdAt"`
	WorkspaceRoot string `json:"workspaceRoot"`
	SourcePath    string `json:"sourcePath"`
}

type PromptMessage struct {
	ID        string `json:"id"`
	Timestamp string `json:"timestamp,omitempty"`
	Text      string `json:"text"`
}

func BuildPromptExtract(_ context.Context, opts GenerateOptions) (*ExtractResult, error) {
	resolvedInput, err := resolveInput(opts.InputPath)
	if err != nil {
		return nil, err
	}

	records, err := readJSONLRecords(resolvedInput)
	if err != nil {
		return nil, err
	}

	sessionID, createdAt, workspaceRoot, err := extractSessionMeta(records)
	if err != nil {
		return nil, err
	}

	prompts := extractUserPrompts(records)
	if len(prompts) == 0 {
		return nil, errors.New("no user prompts found in session")
	}

	extract := PromptExtract{
		SchemaVersion: "1.0",
		Source:        "codex",
		Session: PromptSession{
			ID:            sessionID,
			CreatedAt:     createdAt,
			WorkspaceRoot: workspaceRoot,
			SourcePath:    resolvedInput,
		},
		Prompts: prompts,
	}

	payload, err := json.MarshalIndent(extract, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("marshal prompt extract: %w", err)
	}

	markdown := buildMarkdownFromPrompts(extract)

	return &ExtractResult{
		Extract:  extract,
		JSON:     string(payload),
		Markdown: markdown,
	}, nil
}

func resolveInput(inputPath string) (string, error) {
	info, err := os.Stat(inputPath)
	if err != nil {
		return "", fmt.Errorf("input not found: %w", err)
	}

	if info.IsDir() {
		latest, err := findLatestJSONL(inputPath)
		if err != nil {
			return "", err
		}
		return latest, nil
	}

	if filepath.Ext(inputPath) != ".jsonl" {
		return "", errors.New("expected a Codex session .jsonl file")
	}

	return inputPath, nil
}

func findLatestJSONL(root string) (string, error) {
	type candidate struct {
		path    string
		modTime time.Time
	}

	var files []candidate

	err := filepath.WalkDir(root, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}
		if filepath.Ext(d.Name()) != ".jsonl" {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		files = append(files, candidate{path: path, modTime: info.ModTime()})
		return nil
	})

	if err != nil {
		return "", fmt.Errorf("scan input directory: %w", err)
	}

	if len(files) == 0 {
		return "", errors.New("no .jsonl session files found in input directory")
	}

	sort.Slice(files, func(i, j int) bool {
		return files[i].modTime.After(files[j].modTime)
	})

	return files[0].path, nil
}

func readJSONLRecords(path string) ([]map[string]interface{}, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open session file: %w", err)
	}
	defer func() {
		_ = file.Close()
	}()

	reader := bufio.NewReader(file)
	var records []map[string]interface{}

	for {
		line, err := reader.ReadString('\n')
		line = strings.TrimSpace(strings.TrimSuffix(line, "\n"))

		if err != nil && err != io.EOF {
			return nil, fmt.Errorf("read session file: %w", err)
		}

		if line != "" {
			var record map[string]interface{}
			if err := json.Unmarshal([]byte(line), &record); err == nil {
				records = append(records, record)
			}
		}

		if err == io.EOF {
			break
		}
	}

	if len(records) == 0 {
		return nil, errors.New("session file is empty or unreadable")
	}

	return records, nil
}

func extractSessionMeta(records []map[string]interface{}) (string, string, string, error) {
	for _, record := range records {
		recordType, _ := record["type"].(string)
		if recordType != "session_meta" {
			continue
		}

		payload, ok := record["payload"].(map[string]interface{})
		if !ok {
			return "", "", "", errors.New("session_meta payload missing")
		}

		sessionID, _ := payload["id"].(string)
		createdAt, _ := payload["timestamp"].(string)
		workspaceRoot, _ := payload["cwd"].(string)

		if createdAt == "" {
			createdAt, _ = record["timestamp"].(string)
		}

		if sessionID == "" || createdAt == "" || workspaceRoot == "" {
			return "", "", "", errors.New("session_meta missing required fields")
		}

		return sessionID, createdAt, workspaceRoot, nil
	}

	return "", "", "", errors.New("session_meta record not found")
}

func extractUserPrompts(records []map[string]interface{}) []PromptMessage {
	var prompts []PromptMessage
	index := 1

	for _, record := range records {
		recordType, _ := record["type"].(string)
		if recordType != "event_msg" {
			continue
		}

		payload, ok := record["payload"].(map[string]interface{})
		if !ok {
			continue
		}

		payloadType, _ := payload["type"].(string)
		if payloadType != "user_message" {
			continue
		}

		message, _ := payload["message"].(string)
		message = strings.TrimSpace(message)
		if message == "" {
			continue
		}

		timestamp, _ := record["timestamp"].(string)
		prompts = append(prompts, PromptMessage{
			ID:        fmt.Sprintf("p_%d", index),
			Timestamp: timestamp,
			Text:      message,
		})
		index++
	}

	return prompts
}

func buildMarkdownFromPrompts(extract PromptExtract) string {
	title := deriveTitle(extract.Prompts)
	var builder strings.Builder

	builder.WriteString("<!-- Generated by Specslides -->\n\n")
	builder.WriteString("# ")
	builder.WriteString(title)
	builder.WriteString("\n\n")
	builder.WriteString("Generated from Codex prompts only.\n\n")

	for i, prompt := range extract.Prompts {
		if i > 0 {
			builder.WriteString("---\n\n")
		}

		builder.WriteString("_**User")
		if prompt.Timestamp != "" {
			builder.WriteString(" (")
			builder.WriteString(prompt.Timestamp)
			builder.WriteString(")")
		}
		builder.WriteString("**_\n\n")
		builder.WriteString(prompt.Text)
		builder.WriteString("\n\n")
	}

	return strings.TrimSpace(builder.String())
}

func deriveTitle(prompts []PromptMessage) string {
	if len(prompts) == 0 {
		return "Untitled Specslides"
	}

	first := strings.TrimSpace(prompts[0].Text)
	if first == "" {
		return "Untitled Specslides"
	}

	firstLine := strings.Split(first, "\n")[0]
	firstLine = strings.TrimSpace(firstLine)
	if firstLine == "" {
		return "Untitled Specslides"
	}

	const maxLen = 60
	if len(firstLine) > maxLen {
		return strings.TrimSpace(firstLine[:maxLen])
	}

	return firstLine
}

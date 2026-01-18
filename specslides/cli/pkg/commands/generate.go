package commands

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/specslides/specslides-cli/pkg/codex"
)

const defaultServerURL = "http://localhost:3000"

func RunGenerate(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("generate", flag.ContinueOnError)
	inputPath := fs.String("input", "", "Path to Codex session JSONL file or directory")
	serverURL := fs.String("server", defaultServerURL, "Specslides server URL")
	dryRun := fs.Bool("dry-run", false, "Extract prompts and print payload without uploading")

	if err := fs.Parse(args); err != nil {
		return err
	}

	if strings.TrimSpace(*inputPath) == "" {
		return errors.New("missing required --input path")
	}

	resolvedInput, err := filepath.Abs(*inputPath)
	if err != nil {
		return fmt.Errorf("resolve input path: %w", err)
	}

	result, err := codex.BuildPromptExtract(ctx, codex.GenerateOptions{
		InputPath: resolvedInput,
		ServerURL: *serverURL,
		DryRun:    *dryRun,
	})
	if err != nil {
		return err
	}

	if *dryRun {
		fmt.Println(result.JSON)
		return nil
	}

	fmt.Printf("Session: %s\nPrompts: %d\n", result.Extract.Session.ID, len(result.Extract.Prompts))

	url, err := uploadStory(ctx, *serverURL, result)
	if err != nil {
		return err
	}

	fmt.Println(url)
	return nil
}

func uploadStory(ctx context.Context, serverURL string, result *codex.ExtractResult) (string, error) {
	payload := map[string]interface{}{
		"story": map[string]interface{}{
			"markdown":    result.Markdown,
			"source":      "codex",
			"source_path": result.Extract.Session.SourcePath,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal upload payload: %w", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(serverURL, "/")+"/api/stories", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("build upload request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", fmt.Errorf("upload failed: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	var response struct {
		URL    string `json:"url"`
		Error  string `json:"error"`
		Detail string `json:"details"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("decode upload response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		msg := response.Error
		if msg == "" {
			msg = "upload_failed"
		}
		if response.Detail != "" {
			msg = fmt.Sprintf("%s: %s", msg, response.Detail)
		}
		return "", fmt.Errorf("upload failed: %s", msg)
	}

	if response.URL == "" {
		return "", errors.New("upload failed: missing URL in response")
	}

	return response.URL, nil
}

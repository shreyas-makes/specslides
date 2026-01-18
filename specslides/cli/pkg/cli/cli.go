package cli

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/specslides/specslides-cli/pkg/commands"
)

const helpText = `specslides - generate shareable build stories from Codex sessions

Usage:
  specslides generate --input <path> [--server <url>] [--dry-run]

Commands:
  generate   Extract prompts and upload a deck
  help       Show this help message
`

func Run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		return errors.New(helpText)
	}

	switch args[0] {
	case "help", "-h", "--help":
		return errors.New(helpText)
	case "generate":
		return commands.RunGenerate(ctx, args[1:])
	default:
		return fmt.Errorf("unknown command: %s\n\n%s", args[0], strings.TrimSpace(helpText))
	}
}

package main

import (
	"context"
	"fmt"
	"os"

	"github.com/specslides/specslides-cli/pkg/cli"
)

func main() {
	ctx := context.Background()
	if err := cli.Run(ctx, os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}
}

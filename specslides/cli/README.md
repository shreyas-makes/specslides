# Specslides CLI (Scaffold)

This is a minimal CLI scaffold for the Specslides MVP. It focuses on Codex session input discovery, prompt extraction, and upload wiring.

## Goals

- Define a stable, provider-agnostic session schema.
- Extract prompt-only payloads for slide generation.
- Upload to the Specslides API and return a share URL.

## Commands

- `specslides generate --input <path> [--server <url>] [--dry-run]`

## Schemas

- `pkg/schema/codex-session-data-v1.json`: normalized Codex session structure (inspired by SpecStory SPI).
- `pkg/schema/prompt-extract-v1.json`: prompt-only payload to send to Specslides.

## Next steps

- Implement Codex session discovery and JSONL parsing in `pkg/codex`.
- Add API upload wiring and response handling in `generate`.
- Add interactive prompts for defaults and auth flow.

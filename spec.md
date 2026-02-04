@spec Chatsnip — Local-First Chat Session Capture for Codex CLI

**Status**: Draft  
**Owner**: You  
**Last Updated**: 2026-02-04

**Problem**  
AI coding sessions generate valuable decisions, code snippets, and rationale that are lost across terminals and projects. We need a local-first, open source tool that reliably captures these sessions without requiring cloud sync.

**Solution**  
Chatsnip is a lightweight CLI-first wrapper that launches Codex CLI, captures sessions, and stores them as Markdown in `.chatsnips/history/` within the current project. It is local-only and avoids vendor lock-in.

---

**Goals**
1. Capture Codex CLI conversations automatically with zero manual steps beyond `chatsnip run codex`.
2. Save each session in a deterministic, human-readable Markdown file under `.chatsnips/history/`.
3. Provide a stable session schema to enable future local tooling (summaries, search, stats).
4. Be easy to install and simple to use on macOS and Linux.
5. Deliver excellent DX with a single `npx chatsnip`-style experience.
6. Be fully open source, extensible, and minimal.

**Non-Goals (v1)**
1. Cloud sync, accounts, or hosted search.
2. IDE extensions or GUI.
3. Multi-agent support beyond Codex CLI.
4. Full-text index or semantic search.
5. Session replay or live streaming.
6. Tool-call metadata capture.

---

**User Experience**

**Primary Command**
```bash
chatsnip run codex
```

**Behavior**
- Launches Codex CLI as a child process.
- Captures stdin/stdout and metadata.
- Writes a Markdown session file to `.chatsnips/history/`.
- Writes an optional `.chatsnips/latest.md` symlink or copy for quick access.

**Expected Output**
- Normal Codex CLI output should remain intact.
- Chatsnip logs are minimal and only appear on errors or with `--debug`.

---

**Developer Experience (DX)**

**Installation**
```bash
npx chatsnip run codex
```

**Goals**
- Zero-install path via `npx`.
- Fast startup and no global config required.
- Sensible defaults with optional flags for power users.

---

**Data Storage**

**Path**  
`<project_root>/.chatsnips/history/`

**Filename Format**  
`YYYY-MM-DD_HH-mm-ssZ-<slug>.md`  
Example: `2026-02-04_21-13-55Z-refactor-auth-flow.md`

**Frontmatter (required)**
```yaml
---
chatsnip_version: 0.1.0
session_id: "<uuid>"
agent: "codex-cli"
started_at: "2026-02-04T21:13:55Z"
ended_at: "2026-02-04T21:47:10Z"
project_root: "/abs/path/to/repo"
cwd: "/abs/path/to/repo/subdir"
command: "codex"
args: ["--model", "gpt-5"]
tags: []
---
```

**Body (Markdown)**
- Interleaved user/assistant turns.
- Preserve code blocks and formatting.
- Avoid proprietary metadata unless explicitly requested.

---

**CLI Surface**

**Core Commands**
1. `chatsnip run codex [-- <args...>]`  
   - Launch Codex CLI and capture session.
2. `chatsnip check`  
   - Verifies Codex CLI is installed and accessible.
3. `chatsnip version`

**Flags**
- `--debug`: verbose logs
- `--no-save`: dry run (does not write file)
- `--output <path>`: override default output directory
- `--slug <text>`: override filename slug
- `--resume <session_id>`: resume a previous session if Codex supports it

---

**Session Schema**

**Turn Model**  
Each message is represented with a heading and timestamp.

Example:
```markdown
## User — 2026-02-04T21:14:03Z
Explain the failure in build step 3.

## Assistant — 2026-02-04T21:14:20Z
Here’s what’s happening…
```

**Metadata Requirements**
- `session_id`, `agent`, `started_at`, `ended_at` are required.
- `project_root` and `cwd` required for traceability.

---

**Architecture**

**Modules**
1. CLI Entry
2. Runner (process wrapper for Codex)
3. Recorder (stream capture + buffering)
4. Writer (file generation + slug)
5. Config Loader (optional `~/.config/chatsnip/config.json`)

**Process Flow**
1. Parse CLI args.
2. Resolve project root (git root if available, else CWD).
3. Ensure `.chatsnips/history` exists.
4. Spawn Codex CLI process.
5. Record all I/O streams.
6. Persist Markdown on clean exit or SIGINT.

---

**Configuration**

**Optional Config**  
`~/.config/chatsnip/config.json`
```json
{
  "default_agent": "codex",
  "output_dir": ".chatsnips/history",
  "slug_mode": "prompt"
}
```

---

**Open Source Requirements**
- MIT license
- CONTRIBUTING.md and CODE_OF_CONDUCT.md
- CI pipeline for lint + tests
- Releases via GitHub tags

---

**Testing Strategy**
1. Unit tests for slug generation and file naming.
2. Unit tests for session schema generation.
3. Integration test for “run codex” with a fake child process.

---

**Versioning**
- SemVer
- v0.1.0: Codex CLI support only

---

**Future Extensions**
- Add `chatsnip run claude` and `chatsnip run cursor`.
- Add lightweight search (`chatsnip search "term"`).
- Add summary generator using local prompts.

---

**Open Questions**
1. Should sessions be gzip’d beyond a size threshold?
2. Should we store raw JSON alongside Markdown for easier tooling?

# Chatsnip MVP User Stories

1. Run Codex via Chatsnip
Story: As a user, I can run Codex CLI through Chatsnip so my session is captured without changing how I work.
Acceptance: `chatsnip run codex` launches the Codex TUI and I can interact normally.
Verify: Run the command, complete a short interaction, and exit.
Status: Implemented (TUI via `script`).

2. Create `.chatsnips/history/` on first run
Story: As a user, Chatsnip creates the history directory if it doesn’t exist.
Acceptance: Directory exists after first run with no manual setup.
Verify: Delete `.chatsnips/`, run once, confirm directory exists.
Status: Implemented.

3. Persist session as Markdown
Story: As a user, my chat session is saved as a Markdown file.
Acceptance: File exists with expected filename format and content.
Verify: Ensure file like `YYYY-MM-DD_HH-mm-ssZ-<slug>.md` is created.
Status: Implemented (cleaned transcript section).

4. Frontmatter is complete and correct
Story: As a user, metadata is recorded in frontmatter for traceability.
Acceptance: Frontmatter includes required fields with valid timestamps and paths.
Verify: Parse frontmatter keys and check format.
Status: Not started.

5. Preserve terminal output
Story: As a user, Codex output should appear exactly as normal.
Acceptance: No extra noise unless `--debug` is used.
Verify: Compare output to raw Codex run.
Status: Implemented (TUI pass-through).

6. Slug generation
Story: As a user, filenames include a reasonable slug.
Acceptance: Slug derived from first user prompt or fallback to `session`.
Verify: Check slug when prompt exists vs. empty input.
Status: Not started.

7. `--no-save`
Story: As a user, I can run without writing any files.
Acceptance: No `.chatsnips/history/*.md` is created.
Verify: Run with flag, confirm directory is unchanged.
Status: Not started.

8. `--output <path>` override
Story: As a user, I can change the output directory.
Acceptance: File saved to custom path.
Verify: Run with output, confirm file placement.
Status: Not started.

9. `chatsnip check`
Story: As a user, I can verify Codex is installed.
Acceptance: Exit code 0 when Codex exists, non-zero otherwise.
Verify: Rename `codex` binary or set PATH to confirm failure.
Status: Not started.

10. `chatsnip version`
Story: As a user, I can see the tool version.
Acceptance: Prints a semver string.
Verify: Run command, assert regex match.
Status: Not started.

# Specslides MVP User Journey

Narrator: This document describes the simple, lovable, and complete MVP experience for Specslides. It focuses on the minimum journey that still feels delightful and trustworthy.

## MVP promise
Turn Codex CLI build sessions into a clean, shareable slide deck with a URL and export options, in minutes.

## Primary persona
- Developer who used Codex CLI to build a feature and wants to share the story with teammates or the community.

## Core flow (happy path)
1) Install
- Developer runs `npx specslides@latest` and follows interactive prompts for customization.

2) Connect account
- Developer signs up or logs in via the CLI (browser or device code).
- The account will own the generated slide links.

3) Capture
- Developer points Specslides at a folder with Codex sessions.
- The CLI previews which sessions will be included and confirms.

4) Generate
- Specslides extracts prompts, summarizes the build story, and generates slides.
- The CLI shows progress and a short preview (title + outline).

5) Share
- A shareable URL is returned.
- The deck renders in the browser with a clean, readable theme.
- Developer can export PDF/PNG.

## MVP features
- `npx specslides@latest` with interactive prompts and a `specslides generate` command.
- Codex session import with prompt-only extraction.
- Server-side slide generation with a single default theme.
- Auth for owning decks and managing links.
- Shareable URL with public view access.

## Trust and clarity
- The deck states that only prompts are used (no full transcript).

## Delight moments
- A short, friendly CLI message after generation (for example: "Your build story is ready").
- A compact, attractive cover slide with project name and date.
- Instant share button on the viewer page.

## Edge cases to handle
- No Codex sessions found: show a clear message and guide the user to start their first Codex session, then retry.
- Too many prompts: paginate or collapse long sections.
- Missing or malformed session files: skip with warnings and continue.
- Network/auth failure: show next-step guidance and retry.

## Out of scope for MVP
- Multiple themes or custom branding.
- Team workspaces or collaboration features.
- Real-time updates from an active session.
- Advanced analytics or engagement tracking.

## Success criteria
- A developer can generate a deck in under 5 minutes without reading docs.
- The shareable URL loads quickly and renders correctly on desktop and mobile.
- The story feels accurate and helpful with just the prompts.

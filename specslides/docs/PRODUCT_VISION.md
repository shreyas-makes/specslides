# Specslides Product Vision

Narrator: This document captures the product vision for Specslides as a developer-first tool that turns AI build sessions into shareable, story-driven slides.

## Why this exists
- Developers build with AI every day, but the story of how a feature was built is trapped in chat logs and terminal scrollback.
- Devs need a clean, shareable artifact that explains decisions, tradeoffs, and outcomes in a "prompt" driven story telling format..
- Today’s “chat save” tools preserve raw transcripts, but they don’t turn the story into a presentation-ready narrative.

## Target audience
- Primary: Developers who use Codex CLI (first focus) to build products and want to share their process.

## Core concept
- Specslides turns AI build sessions into shareable slide decks.
- The developer runs an `npx` command, customizes options in the terminal, points it at a folder where Codex has already run sessions, and gets a URL and exportable slides.

## Vision statement
- “Specslides makes AI-assisted development transparent by turning build sessions into crisp, shareable stories.”

## Product principles
- Developer-first: zero-friction `npx` install and simple defaults with optional prompts for customization.
- Story over transcript: No need of the entire transcript. Just the prompts provided conveys the story of how the product was built.
- Portable output: shareable URL and exportable slides.
- Trustworthy: accurately reflects the session without rewriting history.
- Open source first: transparent development and community contributions.

## MVP scope (Codex-first)
- Inputs: Codex chat sessions.
- Output: shareable slide deck with a URL and export options (PDF/PNG). 
- Accounts: users can create accounts and associate shareable slide links with their profile.
- Flow: run a terminal command → upload/process → get a link.

## Key user journey
- Install: `npx specslides@latest` style command with interactive prompts for customization.
- Sign up / login: create an account to own and manage slide links.
- Capture: extract prompts used from the Codex chat sessions
- Transform: Specslides extracts structure and generates slides.
- Share: publish a link on the specslides website for others to view, access..


## Differentiators
- Slides, not just saved transcripts.
- Opinionated narrative structure tailored for build sessions.

## Risks and mitigations
- Risk: Slides feel generic or inaccurate.
  - Mitigation: include slide-level references to source messages.
- Risk: Setup friction.
  - Mitigation: single-command `npx` install with sensible defaults and optional prompts.
- Risk: Fresh users have no Codex sessions to import.
  - Mitigation: detect empty history and guide the user to start their first Codex session, then retry.
- Risk: there might be too many prompts, and the content for the webpage link is too long and might not load properly.
  - Mitigation: implement pagination or scrolling for long content.


## Near-term roadmap
- Codex session import (CLI).
- Slide template v1 for build stories.
- Shareable URLs with basic permissions.

## Longer-term roadmap
- Custom slide themes and branding.

## Non-goals (for now)
- Full project documentation replacement.
- Real-time co-authoring or collaborative editing.
- Complex dashboarding or analytics.
- Monetization or pricing workstreams.

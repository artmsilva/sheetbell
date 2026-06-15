# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial open-source release: a Slack-authenticated form that logs submissions to
  Google Sheets and posts a notification to Slack. Built with **Astro 6** (plain
  Astro — no UI framework) + **Tailwind v4** (`@tailwindcss/vite`), deployed on
  Cloudflare.
- Optional contact reconciliation against an `Eligible` sheet tab (exact +
  fuzzy matching), all sheet/channel/column values configurable via env.
- `submit.js` is a thin mediator over `src/lib/` clients (Google Sheets, Slack,
  matching, validation, rate-limit); atomic sheet append, accurate failure
  status, and lazy-loaded confetti.
- **Declarative workflow engine** (`src/lib/workflow.js`): the form/Slack/Sheets
  pipeline is now data (`src/workflows/`) with `{{ }}` templating, `core`/`when`/
  `unless` step control, and node types (`sheets.append`, `sheets.matchUpdate`,
  `slack.message`, `http.request`). Schema-driven form, **webhook triggers**
  (`/api/hooks/<slug>`, gated by `WEBHOOK_SECRET`), and a read-only `/flows` view.
  Two built-in workflows: `conversation` (form) and `alert` (webhook-only).
- Documentation site under `/docs` (overview, getting started, configuration,
  how it works, deploy), also published to GitHub Pages.
- AI agent tooling: `AGENTS.md`, `CLAUDE.md`, `.claude/` commands, agent, and
  skills, and a `prompts/` library.
- Community health files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  issue/PR templates, Dependabot, and CI workflows.

[Unreleased]: https://github.com/artmsilva/sheetbell/commits/main

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
- Documentation site under `/docs` (overview, getting started, configuration,
  how it works, deploy), also published to GitHub Pages.
- AI agent tooling: `AGENTS.md`, `CLAUDE.md`, `.claude/` commands, agent, and
  skills, and a `prompts/` library.
- Community health files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  issue/PR templates, Dependabot, and CI workflows.

[Unreleased]: https://github.com/artmsilva/sheetbell/commits/main

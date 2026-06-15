# Contributing to Sheetbell

Thanks for your interest! Sheetbell is a small, self-hostable Astro + Cloudflare
app. Contributions of all sizes are welcome.

## Getting started

1. Read **[AGENTS.md](./AGENTS.md)** for the architecture, runtime constraints, and
   conventions, and the docs under `/docs` (start at
   `src/pages/docs/getting-started.md`).
2. Fork and clone the repo, then:
   ```bash
   npm install        # Node 22 — see .nvmrc
   cp .env.example .env
   npm run dev
   ```
3. You don't need real credentials to work on most things (UI, docs, refactors).
   You only need a Slack app + Google service account to exercise the full
   submit → Sheets → Slack loop.

## Using AI assistants

This repo is set up to be AI-friendly. If you use Claude Code, try the bundled
slash commands (`/setup`, `/verify-setup`, `/add-field`, `/deploy-check`), the
`setup-doctor` agent, and the skills under `.claude/`. Copy-paste prompts live in
`prompts/`. Other assistants can read `AGENTS.md`.

## Ground rules

- **No hardcoded deployment values.** Sheet IDs, channel IDs, tab/column names, and
  thresholds go through the env schema in `astro.config.mjs` + `getConfig()` in
  `src/lib/config.js`.
- **Server code must run on Cloudflare**: Web Crypto only — no `node:*`, `Buffer`,
  or `fs`, and no reliance on long-lived in-memory state.
- **Never commit secrets.** `.env` and `.dev.vars` are gitignored.
- Run `npm run build` before opening a PR and make sure it passes.
- Keep the docs in `src/pages/docs/*` in sync with behavior changes.

## Pull requests

- Keep them focused. Use conventional commit prefixes (`feat:`, `fix:`, `docs:`,
  `chore:`, `refactor:`).
- Describe what changed and why. Link any related issue.
- Screenshots help for UI changes.

## Reporting bugs / ideas

Open an issue describing what you expected, what happened, and steps to reproduce.
For security-sensitive reports, please avoid filing a public issue with exploit
details — contact the maintainer privately.

By contributing, you agree your contributions are licensed under the project's
[MIT License](./LICENSE).

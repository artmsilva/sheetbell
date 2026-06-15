# CLAUDE.md

This file guides Claude Code (claude.ai/code) when working in this repository.

The full, tool-agnostic agent guide lives in **[AGENTS.md](./AGENTS.md)** — read it
first. It covers the architecture, commands, the Cloudflare/Web-Crypto runtime
constraints, the configuration model, and the auth/gating story. Everything there
applies to Claude Code too.

## Claude Code specifics

- This repo ships ready-to-use **slash commands** in `.claude/commands/`
  (`/setup`, `/verify-setup`, `/deploy-check`, `/add-field`), a **subagent** in
  `.claude/agents/` (`setup-doctor`), and **skills** in `.claude/skills/`
  (Slack-app and Google-Sheets setup). Prefer them when relevant.
- Copy-paste starter **prompts** are in `prompts/`.

## Hard rules

- **Never hardcode** deployment values (sheet IDs, Slack channel IDs, tab/column
  names, thresholds). Add them to the schema in `astro.config.mjs` and read them
  through `getConfig()` in `src/lib/config.js`.
- **Server code must be Workers-compatible**: Web Crypto only, no `node:*` /
  `Buffer` / `fs`, no reliance on long-lived in-memory state.
- **Never commit secrets.** `.env` and `.dev.vars` are gitignored; keep it that way.
- After TypeScript/Astro edits, run `npm run build` and report failures rather than
  hiding them.
- Keep `src/pages/docs/*` in sync when you change setup, config, or behavior.

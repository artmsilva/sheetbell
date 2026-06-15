---
description: Check my local configuration for missing or likely-wrong settings before I run the app.
allowed-tools: Bash(test:*), Bash(grep:*), Bash(node:*), Read
---

Diagnose whether this project is configured correctly for local development.
Do NOT print secret values — only report presence/absence and shape.

Check and report each as ✅ / ⚠️ / ❌ with a one-line fix:

1. **Tooling**: Node is v22 (`node --version` vs `.nvmrc`); `node_modules` exists.
2. **`.env` exists** (it's gitignored). If missing, tell them to `cp .env.example .env`.
3. **Required vars present** in `.env` (presence only, never echo values):
   `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_OAUTH`, `GOOGLE_SERVICE_KEY`,
   `SPREADSHEET_ID`, `SLACK_CHANNEL_ID`.
4. **Shape sanity** (without revealing values):
   - `SLACK_OAUTH` should start with `xoxb-`.
   - `SLACK_CHANNEL_ID` should look like a channel ID (e.g. starts with `C`), not a
     `#name`.
   - `GOOGLE_SERVICE_KEY` should be a single line of valid JSON containing
     `"client_email"` and `"private_key"`. Flag if it spans multiple lines.
5. **Test targets**: note whether `SPREADSHEET_ID_TEST` / `SLACK_CHANNEL_ID_TEST`
   are set; if not, warn that local runs will hit the production sheet/channel.
6. **Reminders that can't be auto-checked**: the sheet must be shared with the
   service-account `client_email` (Editor), and the bot must be invited to the
   channel.

Finish with a short, prioritized checklist of what to fix.

$ARGUMENTS

---
name: slack-app-setup
description: Guides creating and configuring the Slack app that Sheetbell needs — OAuth sign-in (identity.basic), the chat:write bot token, redirect URLs, and inviting the bot to a channel. Use when setting up Slack credentials, when sign-in fails, or when Slack notifications aren't posting.
---

# Slack app setup for Sheetbell

Sheetbell uses one Slack app for two purposes: **signing users in** (so only people
who authorize can use the form) and **posting notifications** (via a bot token).

## Create the app

1. Go to https://api.slack.com/apps → **Create New App → From scratch**. Name it
   (e.g. "Sheetbell") and choose the workspace.

## OAuth & Permissions

2. Open **OAuth & Permissions**.
3. **Redirect URLs** → add the callback URL and save:
   - Local dev: `https://localhost:4321/api/auth/callback` (use the exact port the
     dev server prints — if 4321 is busy it will differ, and Slack must match).
   - Production: `https://<your-domain>/api/auth/callback`.
4. **Scopes**:
   - **User Token Scopes** → `identity.basic` (used during sign-in to identify the
     user; this is the "Sign in with Slack" scope).
   - **Bot Token Scopes** → `chat:write` (used by the bot token to post messages).
5. **Install to Workspace** and approve.

## Collect the values for `.env`

- **Basic Information** → Client ID → `SLACK_CLIENT_ID`; Client Secret →
  `SLACK_CLIENT_SECRET` (also the session-cookie signing key — rotating it logs
  everyone out).
- **OAuth & Permissions** → Bot User OAuth Token (`xoxb-…`) → `SLACK_OAUTH`.

## Channel

- Open the target channel in Slack → channel name → copy the **Channel ID**
  (e.g. `C0123ABCD`) → `SLACK_CHANNEL_ID`. Use the ID, not the `#name`.
- Invite the bot: in the channel type `/invite @` and pick the bot from
  autocomplete (its name is set under **App Home → Display Name**). Without this you
  get `not_in_channel` when posting.

## How the code uses this (verify if debugging)

- `src/pages/api/auth/login.js` requests `user_scope=identity.basic`.
- `src/pages/api/auth/callback.js` exchanges the code and reads the user identity.
- `src/pages/api/submit.js` posts with `Authorization: Bearer ${SLACK_OAUTH}` to the
  channel from `getConfig().slackChannel`.

## Gotchas

- Redirect URL mismatch (especially the dev port) is the #1 cause of a failing
  sign-in loop.
- `identity.basic` is part of "Sign in with Slack"; add it as a *user* scope.
- Sign-in accepts any Slack account that completes the flow — it is not restricted
  to your workspace unless you add a team-ID check in `callback.js`.

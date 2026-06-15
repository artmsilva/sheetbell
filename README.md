# Sheetbell

A small, self-hostable web app: a form, gated behind **Sign in with Slack**, that
**logs each submission to a Google Sheet** and **rings a Slack channel** with a
formatted notification. It also ships a bonus **Slack profile-photo framing tool**.

Built with [Astro](https://astro.build) (SSR) + React + Tailwind, and deployed on
**Cloudflare** — so all server code runs on the Web platform (Web Crypto, `fetch`),
with no Node-only dependencies.

> Sheetbell is the open-source flavor of an internal "log a conversation" tool. The
> defaults reflect a lightweight CRM workflow (a `Conversations` log + an `Eligible`
> contact roster), but every sheet name, column, channel, and threshold is
> configurable, so you can repurpose it for any "form → sheet → Slack" use case.

## Features

- **Slack sign-in gate** — the form and its submit endpoint require signing in
  with Slack. (By default this accepts any Slack account that completes sign-in;
  restricting to your own workspace is a small code change — see the docs.)
- **Appends to a Google Sheet** — each submission becomes a new row in a
  `Conversations` tab (timestamp, organizer, contact, date, message).
- **Slack notifications** — a Block Kit message announces each submission;
  follow-ups are threaded under it.
- **Optional contact reconciliation** — looks up the submitted contact in an
  `Eligible` tab using exact, substring, token, and fuzzy (Levenshtein) matching,
  then stamps "last engagement" and "notes" columns.
- **Slack Photo Flair** (`/slackphoto`) — a client-side tool to add a frame/overlay
  to a Slack profile photo.
- **Built-in hardening** — same-origin CORS, per-IP rate limiting, request-size cap,
  strict input validation, and security headers.

## Stack

| Concern        | Choice                                             |
| -------------- | -------------------------------------------------- |
| Framework      | Astro 5 (`output: "server"`)                       |
| UI             | React 19 islands + Tailwind                        |
| Host / runtime | Cloudflare adapter (Workers-style, Web Crypto)     |
| Auth           | Slack OAuth → HMAC-signed JWT in an HttpOnly cookie |
| Data           | Google Sheets API v4 (service account, RS256 JWT)  |

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- A Slack workspace where you can create an app
- A Google Cloud project with the Sheets API enabled
- A Google Sheet you control

## Setup

### 1. Install

```bash
npm install
cp .env.example .env   # then fill it in (see below)
```

### 2. Create a Slack app

At <https://api.slack.com/apps> → **Create New App**:

- **OAuth & Permissions → Redirect URLs**: add `https://<your-origin>/api/auth/callback`
  (for local dev this is `https://localhost:4321/api/auth/callback`).
- **User Token Scopes**: add `identity.basic` (used to identify the signed-in user).
- **Bot Token Scopes**: add `chat:write` (used to post notifications).
- Install the app to your workspace, then copy:
  - **Client ID** → `SLACK_CLIENT_ID`
  - **Client Secret** → `SLACK_CLIENT_SECRET`
  - **Bot User OAuth Token** (`xoxb-…`) → `SLACK_OAUTH`
- Invite the bot to your target channel(s): `/invite @YourApp`. Use the channel
  **IDs** (e.g. `C0123ABCD`, found in the channel's "Get channel details") for
  `SLACK_CHANNEL_ID` / `SLACK_CHANNEL_ID_TEST`.

### 3. Create a Google service account

1. In Google Cloud Console, enable the **Google Sheets API**.
2. Create a **service account** and generate a **JSON key**.
3. Put the entire JSON (single line) in `GOOGLE_SERVICE_KEY`.
4. **Share your spreadsheet** with the service account's `client_email`
   (give it **Editor** access). This step is required — without it the API
   returns permission errors.

### 4. Prepare the spreadsheet

Put the spreadsheet ID (the long token in its URL) in `SPREADSHEET_ID`.

- **`Conversations` tab** — the append target. Rows are written as columns
  A–E: `Timestamp · Organizer · Contact · Date · Message`. A header row is
  recommended.
- **`Eligible` tab** *(optional)* — a contact roster. Column **A** holds contact
  names; the header row must include the columns named by
  `ELIGIBLE_ENGAGEMENT_COLUMN` and `ELIGIBLE_NOTES_COLUMN`. If you don't need
  this feature, just omit the tab — the lookup is skipped when no match is found.

### 5. Run locally

```bash
npm run dev
```

The dev server runs over **HTTPS** (via `@vitejs/plugin-basic-ssl`) because Slack
OAuth requires it. Accept the self-signed certificate warning in your browser.

## Configuration reference

Secrets and IDs are read at runtime from the environment.

| Variable                     | Required | Default                          | Purpose                                            |
| ---------------------------- | -------- | -------------------------------- | -------------------------------------------------- |
| `SLACK_CLIENT_ID`            | ✅       | —                                | Slack OAuth client ID                              |
| `SLACK_CLIENT_SECRET`        | ✅       | —                                | Slack OAuth secret; also the session-signing key   |
| `SLACK_OAUTH`                | ✅       | —                                | Bot token (`xoxb-…`) for posting messages          |
| `GOOGLE_SERVICE_KEY`         | ✅       | —                                | Service-account JSON (single line)                 |
| `SPREADSHEET_ID`             | ✅       | —                                | Target spreadsheet (production)                    |
| `SLACK_CHANNEL_ID`           | ✅       | —                                | Target channel (production)                        |
| `SPREADSHEET_ID_TEST`        | —        | falls back to `SPREADSHEET_ID`   | Spreadsheet used when not in production            |
| `SLACK_CHANNEL_ID_TEST`      | —        | falls back to `SLACK_CHANNEL_ID` | Channel used when not in production                |
| `APP_NAME`                   | —        | `Sheetbell`                      | Brand shown in the navbar                          |
| `SHEET_TAB_CONVERSATIONS`    | —        | `Conversations`                  | Tab to append submissions to                       |
| `SHEET_TAB_ELIGIBLE`         | —        | `Eligible`                       | Tab to reconcile contacts against                  |
| `ELIGIBLE_ENGAGEMENT_COLUMN` | —        | `Last engagement / who did it`   | Header of the column to stamp with engagement      |
| `ELIGIBLE_NOTES_COLUMN`      | —        | `Last Conversation Notes`        | Header of the column to write notes into           |
| `MATCH_SIMILARITY_THRESHOLD` | —        | `0.7`                            | Fuzzy-match cutoff (0–1) for contact reconciliation |

The app picks production vs. test targets from a `PROD` flag, which is true when
`CF_PAGES === "1"`, `MODE === "production"`, or Astro's `import.meta.env.PROD` is set.

## Deploy to Cloudflare

This project uses `@astrojs/cloudflare`. Build with `npm run build` and deploy the
output with your Cloudflare Pages/Workers workflow. Set all required variables as
environment variables (and secrets for the sensitive ones — `SLACK_CLIENT_SECRET`,
`SLACK_OAUTH`, `GOOGLE_SERVICE_KEY`). Remember to add the deployed origin's
`/api/auth/callback` URL to your Slack app's redirect URLs.

## How it works

- `src/middleware.js` gates the form page `/` (redirect to Slack sign-in) and the
  `/api/submit` endpoint (401 without a session). `/slackphoto` and `/docs` are
  public.
- `src/lib/auth.js` mints and verifies an HMAC-signed session token (Web Crypto),
  stored in an HttpOnly, `SameSite=Lax`, `Secure` cookie. Note: the signing key is
  `SLACK_CLIENT_SECRET`, so rotating that value logs everyone out.
- `src/lib/config.js` builds all runtime configuration from environment variables
  (via `astro:env/server`, so it works the same locally and in production).
- `src/pages/api/submit.js` validates input, writes to Sheets, and posts to Slack.

Full setup and walkthrough live in the docs site under **`/docs`** (start with
`/docs/getting-started`).

## License

[MIT](./LICENSE)

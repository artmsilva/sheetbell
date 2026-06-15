---
description: Walk me through setting up Sheetbell from scratch, one step at a time.
---

You are guiding the user through first-time setup of this project. Be patient and
concrete; assume they may be new to Slack apps and Google Cloud.

Work from the authoritative tutorial in `src/pages/docs/getting-started.md` — read
it first so your steps match the code exactly. Then guide the user interactively:

1. Confirm prerequisites: `git --version`, `node --version` (want v22), and that
   they've run `npm install` and `cp .env.example .env`.
2. Walk the Slack app creation (redirect URL `https://localhost:<port>/api/auth/callback`,
   `identity.basic` user scope, `chat:write` bot scope), collecting
   `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_OAUTH`, and the channel ID.
3. Walk the Google service account + sheet sharing, collecting `GOOGLE_SERVICE_KEY`
   and `SPREADSHEET_ID`. Remind them to share the sheet with the service-account
   `client_email` and to paste the JSON as one line (`jq -c . < key.json`).
4. Encourage setting `SPREADSHEET_ID_TEST` / `SLACK_CHANNEL_ID_TEST` to throwaway
   targets so their first test doesn't hit production.
5. Have them run `npm run dev`, confirm the printed port matches the Slack redirect
   URL, and submit one test entry.

Check off each item as it's done. After each step, verify before moving on. If
something fails, consult the Troubleshooting table in the tutorial. Do not skip the
"share the sheet with the service account" step — it's the most common failure.

$ARGUMENTS

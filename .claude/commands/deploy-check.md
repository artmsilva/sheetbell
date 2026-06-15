---
description: Run a pre-deploy readiness check for Cloudflare.
allowed-tools: Bash(npm run build:*), Read, Bash(git status:*)
---

Verify this project is ready to deploy to Cloudflare. Follow
`src/pages/docs/deploy.md` and report a go/no-go checklist:

1. `npm run build` succeeds cleanly.
2. No uncommitted changes that should be committed (`git status`).
3. Confirm the user has set, in their Cloudflare project (you can't read these —
   ask them to confirm): `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` (secret),
   `SLACK_OAUTH` (secret), `GOOGLE_SERVICE_KEY` (secret), `SPREADSHEET_ID`,
   `SLACK_CHANNEL_ID`. Sensitive ones must be stored as **secrets**.
4. Remind them to add the production `https://<domain>/api/auth/callback` to the
   Slack app's redirect URLs.
5. Remind them the production sheet must be shared with the service account and the
   bot invited to the production channel.
6. Note the `SESSION` KV binding warning is harmless (this app uses stateless
   cookie sessions) unless Cloudflare errors with "Invalid binding `SESSION`".

End with a clear "ready to deploy" or a list of blockers.

$ARGUMENTS

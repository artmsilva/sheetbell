# Starter prompts

Copy-paste these into your AI coding assistant (Claude Code, Cursor, etc.) when
working on Sheetbell. They assume the assistant can read this repo. In Claude Code,
several of these also exist as slash commands (`/setup`, `/verify-setup`,
`/deploy-check`, `/add-field`) — see `.claude/commands/`.

---

## Set it up with me

> Walk me through setting up this project from scratch, one step at a time. Use the
> tutorial in `src/pages/docs/getting-started.md`. Check that I have the
> prerequisites, then guide me through the Slack app, the Google service account,
> sharing the sheet, filling in `.env`, and running a first test. Pause after each
> step until I confirm it worked.

## Diagnose why it's not working

> Something isn't working: <describe — e.g. "submitting the form returns 500" or
> "sign-in keeps looping">. Act as the setup doctor: read the relevant code, check
> my configuration (presence/shape only, never print secrets), and give me an
> ordered list of likely causes and specific fixes.

## Add a new form field

> Add a new field to the form called "<label>" (key `<key>`, type `<text/date/…>`,
> <required/optional>). Wire it through every layer: the markup + `fieldIds` array
> in `src/components/FormPage.astro`, the validation schema in
> `src/pages/api/submit.js`, and the row written by `updateConvoLog`. Then run
> `npm run build` and update the docs if the sheet layout changed.

## Customize it for my use case

> I want to repurpose this from "logging conversations" to "<my use case>". Help me
> rename the fields and Slack message wording, set the right `Conversations` columns,
> and decide whether I need the `Eligible` reconciliation tab. Keep all config in
> environment variables — don't hardcode anything.

## Restrict sign-in to my workspace

> Right now sign-in accepts any Slack account. Modify `src/pages/api/auth/callback.js`
> so it only creates a session if the user's Slack team/workspace ID matches mine.
> Make the allowed workspace ID configurable via an environment variable (add it to
> the schema in `astro.config.mjs`).

## Make the rate limiter durable

> The rate limiter in `src/pages/api/submit.js` is in-memory and per-instance on
> Cloudflare. Replace it with a durable counter using Cloudflare KV or a Durable
> Object, keeping the same 10-requests-per-minute-per-IP behavior. Update the docs.

## Get a deploy ready

> Run a pre-deploy readiness check for Cloudflare using `src/pages/docs/deploy.md`:
> confirm `npm run build` passes, list the environment variables/secrets I must set,
> and remind me of the Slack redirect URL, sheet sharing, and bot invite steps.

## Explain the codebase to me

> Give me a tour of how this app works, following a single form submission from the
> browser through `src/pages/api/submit.js` to Google Sheets and Slack. Reference
> `AGENTS.md` and the `/docs` pages.

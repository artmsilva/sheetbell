---
layout: ../../layouts/DocsLayout.astro
title: Deploy
description: Put Sheetbell on the internet with Cloudflare.
---

# Deploy

Running locally is great for development, but eventually you want a real URL your
team can visit. Sheetbell is built for **Cloudflare** (via the `@astrojs/cloudflare`
adapter). This page covers the idea and the checklist; Cloudflare's own UI changes
over time, so follow their current prompts for the exact clicks.

## The big picture

Deploying means three things happen:

1. Your code is **built** into a deployable bundle (`npm run build`).
2. That bundle is **uploaded** to Cloudflare, which serves it on a URL.
3. Your **environment variables** are set on Cloudflare — the same ones from your
   `.env`, but configured in their dashboard instead of a file.

## Build

```bash
npm run build
```

This produces the output that Cloudflare serves. You can sanity-check it locally
with `npm run preview`.

## Set environment variables on Cloudflare

In your Cloudflare project's settings, add every required variable from
**[Configuration](/docs/configuration)**:

- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET` — store as a **secret**
- `SLACK_OAUTH` — store as a **secret**
- `GOOGLE_SERVICE_KEY` — store as a **secret**
- `SPREADSHEET_ID`
- `SLACK_CHANNEL_ID`

Add any optional ones you want to override. Use Cloudflare's **secret** option
(rather than a plain variable) for the three sensitive values above. If you're
using `wrangler` from the command line, that looks like:

```bash
wrangler secret put SLACK_CLIENT_SECRET
wrangler secret put SLACK_OAUTH
wrangler secret put GOOGLE_SERVICE_KEY
```

## If Cloudflare mentions a `SESSION` binding

The build prints a note about a Cloudflare KV `SESSION` binding. This app uses
**stateless signed cookies** for login (not Astro's server-side sessions), so it
doesn't need that binding to work. You can ignore the note. Only if Cloudflare
actually errors with "Invalid binding `SESSION`" do you need to create a KV
namespace and bind it as `SESSION` in your Cloudflare project settings.

## Optional: enable idempotency (KV)

To prevent duplicate rows on retries/double-submits, bind a KV namespace named
`IDEMPOTENCY`:

```bash
wrangler kv namespace create IDEMPOTENCY
```

Then add the binding to your Cloudflare project — in the dashboard under
**Settings → Bindings → KV namespace** (variable name `IDEMPOTENCY`), or in your
`wrangler` config:

```jsonc
{
  "kv_namespaces": [{ "binding": "IDEMPOTENCY", "id": "<the-id-from-above>" }]
}
```

That's it — the app detects the binding at runtime and starts deduping. Skip this
and submissions still work; they just won't dedupe retries.

## Point Slack at your real URL

Once you know your deployed address (say `https://sheetbell.example.com`), go back
to your Slack app's **OAuth & Permissions → Redirect URLs** and add:

```
https://sheetbell.example.com/api/auth/callback
```

Keep the `localhost` one too if you still develop locally — a Slack app can have
several redirect URLs.

## Pre-launch checklist

- [ ] All required environment variables are set on Cloudflare.
- [ ] Sensitive values are stored as **secrets**.
- [ ] The production **Redirect URL** is added to the Slack app.
- [ ] The production spreadsheet is **shared** with the service account email.
- [ ] The bot is **invited** to the production Slack channel.
- [ ] You submitted one real test entry and saw the row + the Slack message.

## After deploy

Visit your URL. You should be redirected to Slack to sign in, then land on the
form. Submit a test entry and confirm a row appears in the sheet and a message in
Slack — the same loop you verified in **[Getting started](/docs/getting-started)**,
now in production.

If something fails, the **Troubleshooting** table in
[Getting started](/docs/getting-started#troubleshooting) applies here too; the
causes are the same, just with production values instead of local ones.

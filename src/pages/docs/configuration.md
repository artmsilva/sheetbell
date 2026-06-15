---
layout: ../../layouts/DocsLayout.astro
title: Configuration
description: Every environment variable explained, plus how to lay out your spreadsheet.
---

# Configuration

Sheetbell reads all of its settings from **environment variables** — values that
live outside the code so you can change them per deployment without editing
anything. Locally they go in your `.env` file; in production you set them in your
host's dashboard (see **[Deploy](/docs/deploy)**).

A single helper, `src/lib/config.js`, reads these values and applies defaults, so
there's exactly one place that decides what each setting means.

## Required settings

You can't run the app without these:

| Variable | What it is |
| --- | --- |
| `SLACK_CLIENT_ID` | Your Slack app's client ID. Identifies the app during sign-in. |
| `SLACK_CLIENT_SECRET` | Your Slack app's secret. Also used to sign the login cookie, so keep it secret. |
| `SLACK_OAUTH` | The bot token (`xoxb-…`) used to post messages. |
| `GOOGLE_SERVICE_KEY` | The service-account JSON, as a single line. |
| `SPREADSHEET_ID` | The spreadsheet that rows are written to. |
| `SLACK_CHANNEL_ID` | The channel that notifications are posted to. |

## Optional settings

These all have sensible defaults — set them only if you want to change the
default behavior:

| Variable | Default | What it does |
| --- | --- | --- |
| `WEBHOOK_SECRET` | _unset_ | Secret token that enables webhook triggers (`/api/hooks/<slug>`). Webhooks are off until this is set. See [Workflows](/docs/workflows). |
| `SPREADSHEET_ID_TEST` | falls back to `SPREADSHEET_ID` | A separate scratch spreadsheet used when not in production. |
| `SLACK_CHANNEL_ID_TEST` | falls back to `SLACK_CHANNEL_ID` | A separate channel used when not in production. |
| `APP_NAME` | `Sheetbell` | The name shown in the navigation bar. |
| `SHEET_TAB_CONVERSATIONS` | `Conversations` | The tab name that submissions are appended to. |
| `SHEET_TAB_ELIGIBLE` | `Eligible` | The tab name used by contact matching. |
| `ELIGIBLE_ENGAGEMENT_COLUMN` | `Last engagement / who did it` | Header text of the column to stamp. |
| `ELIGIBLE_NOTES_COLUMN` | `Last Conversation Notes` | Header text of the notes column. |
| `MATCH_SIMILARITY_THRESHOLD` | `0.7` | How close a fuzzy name match must be (0–1). |

## Production vs. test

The app keeps a `PROD` flag. It's **on** when any of these is true: the host sets
`CF_PAGES=1`, `MODE=production`, or Astro's build is production.

- When `PROD` is on, it uses `SPREADSHEET_ID` and `SLACK_CHANNEL_ID`.
- When it's off (local dev, previews), it prefers `SPREADSHEET_ID_TEST` and
  `SLACK_CHANNEL_ID_TEST` if you set them, otherwise it falls back to the main
  ones.

This lets you point local development at a throwaway sheet and channel so you
don't spam your real channel while experimenting.

## Spreadsheet layout

### The `Conversations` tab (required)

Every submission becomes a new row, written into columns **A–E** in this order:

| A | B | C | D | E |
| --- | --- | --- | --- | --- |
| Timestamp | Organizer | Contact | Date | Message |

A header row in row 1 is recommended for humans, but the app finds the next empty
row regardless.

### The `Eligible` tab (optional)

This powers the contact-reconciliation feature. It's a roster of known contacts,
one per row, with their **name in column A** and a header row that includes the
two columns named by `ELIGIBLE_ENGAGEMENT_COLUMN` and `ELIGIBLE_NOTES_COLUMN`.

When someone submits, the app tries to find the contact in this tab:

1. First by exact, substring, and token matching on the normalized name.
2. If that fails, by **fuzzy matching** — it measures how similar two names are
   (using Levenshtein distance) and accepts the best match above
   `MATCH_SIMILARITY_THRESHOLD`. Raising the threshold makes matching stricter;
   lowering it makes it more forgiving (and more likely to mismatch).

If a contact is found, the app stamps the engagement column with
`"<organizer> - <date>"` and writes the message into the notes column. If the tab
or a matching contact doesn't exist, this step is simply skipped — the
`Conversations` row and Slack message still happen.

> Don't need a contact roster? Leave the `Eligible` tab out. Nothing breaks.

## A note on secrets

`SLACK_CLIENT_SECRET`, `SLACK_OAUTH`, and `GOOGLE_SERVICE_KEY` are sensitive. Keep
them out of git (your `.env` is already ignored), and in production store them as
**secrets**, not plain variables, where your host offers the distinction.

> Note: `SLACK_CLIENT_SECRET` does double duty — it's also the key used to sign
> login-session cookies. If you ever rotate it in Slack, every active session
> becomes invalid and all users are signed out and must sign in again.

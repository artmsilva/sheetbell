---
name: google-sheets-setup
description: Guides creating a Google service account, enabling the Sheets API, formatting the GOOGLE_SERVICE_KEY JSON as one line, and sharing the spreadsheet so Sheetbell can write to it. Use when setting up Google credentials, when sheet writes fail, or when seeing GOOGLE_SERVICE_KEY parse errors.
---

# Google Sheets setup for Sheetbell

Sheetbell writes to your sheet using a **service account** — a robot Google
identity. It signs a JWT with the service account's key and calls the Sheets API.

## Create the service account

1. In the [Google Cloud Console](https://console.cloud.google.com/), create or pick
   a project.
2. Enable the **Google Sheets API** (APIs & Services → Library → search "Sheets").
3. APIs & Services → **Credentials → Create Credentials → Service account**. Name
   and create it.
4. Open the service account → **Keys** tab → **Add Key → Create new key → JSON**.
   A `.json` file downloads. Treat it like a password.

## Put the key in `.env` as one line

The downloaded file is multi-line; `.env` needs it on a single line with the
`private_key`'s `\n` escapes intact:

```bash
jq -c . < ~/Downloads/your-key.json    # preferred
# or:
tr -d '\n' < ~/Downloads/your-key.json
```

Paste the output wrapped in single quotes:

```
GOOGLE_SERVICE_KEY='{"type":"service_account","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n", ...}'
```

If you see `Failed to parse GOOGLE_SERVICE_KEY`, it has real line breaks or got
truncated — redo with `jq -c`.

## Share the spreadsheet (the step everyone forgets)

1. Get the spreadsheet ID from its URL
   (`https://docs.google.com/spreadsheets/d/<ID>/edit`) → `SPREADSHEET_ID`.
2. In the key JSON, find `client_email`
   (`something@your-project.iam.gserviceaccount.com`).
3. In the spreadsheet, **Share** → paste that email → give **Editor** access. If
   Google warns the address is outside your org / can't be notified, share anyway
   and uncheck "Notify people."

Without this share, the API returns permission errors and no rows are written.

## Sheet structure

- **`Conversations`** tab (required): rows are appended as columns A–E —
  `Timestamp · Organizer · Contact · Date · Message`.
- **`Eligible`** tab (optional): contact roster; column A is the name, and the
  header row must include the columns named by `ELIGIBLE_ENGAGEMENT_COLUMN` and
  `ELIGIBLE_NOTES_COLUMN`. Omit the tab to skip the reconciliation feature.

Tab and column names are configurable — see `src/pages/docs/configuration.md`.

## How the code uses this (verify if debugging)

`src/pages/api/submit.js`: `getAccessToken` builds an RS256 JWT from
`GOOGLE_SERVICE_KEY` and exchanges it for a token; `sheetsAPI.get/update` call the
Sheets v4 REST API against `getConfig().spreadsheetId`.

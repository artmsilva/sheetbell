---
layout: ../../layouts/DocsLayout.astro
title: Getting started
description: A step-by-step tutorial to get Sheetbell running on your machine.
---

# Getting started

By the end of this page you'll have Sheetbell running on your own computer, with a
real form that writes to your spreadsheet and posts to your Slack. We'll go one
step at a time. If something doesn't work, check **[Troubleshooting](#troubleshooting)**
at the bottom — most first-run problems are listed there.

## Step 0 — Check your tools

Open a terminal and confirm Node.js is installed and recent enough:

```bash
node --version
```

You want **v22** (the project is pinned to it in `.nvmrc`). If you use a version
manager like `nvm`, run `nvm use` inside the project folder and it will pick the
right version automatically.

## Step 1 — Install the project

From the project folder:

```bash
npm install
```

This downloads the libraries the app depends on into a `node_modules` folder. It
can take a minute. You only need to do it once (and again whenever dependencies
change).

Now make your own copy of the settings file:

```bash
cp .env.example .env
```

`.env` is where your secret keys and IDs live. It is **ignored by git** on purpose
— never commit it. We'll fill it in as we go. Leave it open in your editor.

> Throughout this tutorial, whenever you see a line like `SLACK_CLIENT_ID=`, it
> means: find that line in your `.env` file and paste the value after the `=`.

## Step 2 — Create a Slack app

Sheetbell uses Slack for two things: **signing people in** and **posting
notifications**. Both come from one "Slack app" that you create now.

1. Go to <https://api.slack.com/apps> and click **Create New App → From scratch**.
   Give it a name (e.g. "Sheetbell") and pick your workspace.
2. In the left menu, open **OAuth & Permissions**.
3. Under **Redirect URLs**, add this exact URL and save:

   ```
   https://localhost:4321/api/auth/callback
   ```

   This is the page Slack sends people back to after they sign in. (When you
   deploy later, you'll add your real website's address here too.)
4. Still on that page, find **Scopes**. Scopes are permissions. Add:
   - Under **User Token Scopes**: `identity.basic` — lets the app learn *who*
     signed in (their name and ID), nothing more.
   - Under **Bot Token Scopes**: `chat:write` — lets the app post messages.
5. Scroll up and click **Install to Workspace**, then **Allow**.

Now collect three values:

- On **Basic Information**, copy the **Client ID** and **Client Secret**:

  ```
  SLACK_CLIENT_ID=...
  SLACK_CLIENT_SECRET=...
  ```

- Back on **OAuth & Permissions**, copy the **Bot User OAuth Token** (it starts
  with `xoxb-`):

  ```
  SLACK_OAUTH=xoxb-...
  ```

### Pick a channel for notifications

Decide which Slack channel should receive the messages. In Slack, open that
channel, click its name, and copy the **Channel ID** at the bottom of the details
(it looks like `C0123ABCD` — an ID, not the `#name`). Paste it in:

```
SLACK_CHANNEL_ID=C0123ABCD
```

Finally, invite your app's bot into that channel by typing this in the channel:

```
/invite @Sheetbell
```

If you skip the invite, posting will fail with a `not_in_channel` error later.

## Step 3 — Create a Google service account

A **service account** is a robot Google account that your app logs in as, so it
can edit your spreadsheet without you being present.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create
   (or pick) a project.
2. Search for **Google Sheets API** and click **Enable**.
3. Go to **APIs & Services → Credentials → Create Credentials → Service account**.
   Give it a name and create it.
4. Open the new service account, go to the **Keys** tab, and choose **Add Key →
   Create new key → JSON**. A `.json` file downloads. This is a secret — treat it
   like a password.
5. Open that JSON file. You need it as a **single line** with no line breaks. Paste
   the whole thing as the value:

   ```
   GOOGLE_SERVICE_KEY={"type":"service_account","project_id":"...", ...}
   ```

   If your editor wraps it, that's only visual — what matters is there are no
   actual newline characters inside the value.

## Step 4 — Set up and share your spreadsheet

1. Create a Google Sheet (or use an existing one).
2. Look at its URL. The long code between `/d/` and `/edit` is the **spreadsheet
   ID**. Copy it:

   ```
   https://docs.google.com/spreadsheets/d/THIS_LONG_PART/edit
   ```

   ```
   SPREADSHEET_ID=THIS_LONG_PART
   ```
3. Add a tab named **`Conversations`**. This is where submissions are appended.
   Put a header row in row 1 (suggested): `Timestamp`, `Organizer`, `Contact`,
   `Date`, `Message`.
4. **Share the sheet with your robot.** Open the JSON key from Step 3 and find the
   `client_email` field — it looks like `something@your-project.iam.gserviceaccount.com`.
   Click **Share** in the spreadsheet, paste that email, and give it **Editor**
   access.

   This step is easy to forget and is the #1 reason the app can't write to the
   sheet. If your robot isn't a sharer, Google says no.

> The `Eligible` tab (the contact-roster feature) is optional. You can skip it for
> now — the app simply does nothing extra when it's missing. See
> **[Configuration](/docs/configuration)** when you're ready for it.

## Step 5 — Run it

Start the development server:

```bash
npm run dev
```

It runs over **HTTPS** (a secure connection), because Slack sign-in requires it.
Your browser will warn that the certificate is self-signed — that's expected on
your own machine. Click through the warning to continue.

Open the address it prints (usually `https://localhost:4321`). Because the form is
gated, you'll be redirected to Slack to sign in. Approve it, and you'll land back
on the form.

## Step 6 — Submit a test entry

Fill in the form and press **Submit**. If everything is wired up:

- Confetti celebrates the submission. 🎉
- A new row appears in your `Conversations` tab.
- A message shows up in your Slack channel.

That's the whole loop working end to end. Congratulations.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Browser warns the site is unsafe | Self-signed HTTPS cert in dev — safe to click through. |
| Stuck redirecting to Slack | The **Redirect URL** in your Slack app doesn't exactly match `https://localhost:4321/api/auth/callback`. |
| Slack error `not_in_channel` | You didn't `/invite` the bot into the channel. |
| Slack error `channel_not_found` | `SLACK_CHANNEL_ID` is a name, not an ID, or the bot can't see it. |
| Nothing written to the sheet | The sheet isn't shared with the service account's `client_email`, or `SPREADSHEET_ID` is wrong. |
| `Failed to parse GOOGLE_SERVICE_KEY` | The JSON has real line breaks or got truncated — paste it as one line. |
| Changes to `.env` not picked up | Restart `npm run dev`; environment values are read at startup. |

Once the loop works, head to **[Configuration](/docs/configuration)** to tailor the
sheet layout, channels, and the optional contact-matching feature — or
**[How it works](/docs/how-it-works)** to understand the code.

---
layout: ../../layouts/DocsLayout.astro
title: Overview
description: What Sheetbell is and how these docs are organized.
---

# Sheetbell documentation

Sheetbell is a small web app with one job: show people a form, and when they
submit it, **save the answer to a Google Sheet** and **post a message to Slack**.
Only people in your Slack workspace can open the form, so you don't have to build
your own login system.

If you've never wired an app up to Google or Slack before, that's fine — this
guide walks through every step and explains what each piece is doing.

## The mental model

It helps to picture the app as a relay with four parts:

1. **The form** — a normal web page with a few fields (who, when, what).
2. **The gate** — before the form loads, the app checks "are you signed in with
   Slack?" If not, it sends you to Slack to sign in.
3. **The handler** — when you press submit, the data goes to a small server
   function that checks the input, then talks to Google and Slack.
4. **The destinations** — a row gets added to a Google Sheet, and a notification
   gets posted to a Slack channel.

```
 Browser ──submit──▶ /api/submit ──▶ Google Sheets (new row)
                          └────────▶ Slack channel (notification)
```

You don't need to understand all of it before you start. Follow the tutorial and
it will click as you go.

## What you'll need

- A computer with **Node.js 22** installed (the version is pinned in `.nvmrc`).
- A **Slack workspace** where you're allowed to create an app.
- A **Google account** and one spreadsheet you can edit.

Don't worry about getting accounts or keys ready yet — the tutorial tells you
exactly when to create each one.

## Where to go next

- **[Getting started](/docs/getting-started)** — the hands-on tutorial. Start here.
- **[Configuration](/docs/configuration)** — every setting explained, plus how to
  lay out your spreadsheet.
- **[How it works](/docs/how-it-works)** — a tour of the code, once you want to
  change something.
- **[Deploy](/docs/deploy)** — putting it on the internet with Cloudflare.

> New to the project? Read the pages in the order above. Each one assumes you've
> done the one before it.

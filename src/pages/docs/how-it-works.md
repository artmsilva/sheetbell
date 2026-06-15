---
layout: ../../layouts/DocsLayout.astro
title: How it works
description: A guided tour of the code, so you can change it with confidence.
---

# How it works

This page follows a single request through the app, pointing at the files
involved so you know where to look when you want to change something. You don't
need this to *use* Sheetbell — it's for when you want to modify it.

## The stack, briefly

- **[Astro](https://astro.build)** renders the pages and runs the server
  endpoints. It's set to `output: "server"`, meaning pages are built on each
  request rather than frozen at build time.
- **React** powers the interactive bits (the form, the photo tool) as "islands" —
  small interactive components dropped into otherwise static pages.
- **Tailwind** provides styling utility classes.
- The app is deployed on **Cloudflare**, which runs code in a browser-like
  environment rather than Node. That has one important consequence (below).

### Why there's no Node `crypto` or `Buffer`

Because the server runs on the Web platform, the code uses **Web Crypto**
(`crypto.subtle`) and `btoa`/`atob` instead of Node's `crypto` module or
`Buffer`. You'll see this in `src/lib/auth.js` (signing login cookies) and in
`src/pages/api/submit.js` (signing the Google token). If you add server code,
stick to Web APIs or it won't run in production.

## Following a visit

### 1. The gate — `src/middleware.js`

Middleware runs before every request. This one checks whether the path is in
`PROTECTED_ROUTES` (just `/` by default). If it is, it reads the login cookie and
verifies it. No valid cookie means a redirect to `/api/auth/login`. A valid cookie
means the signed-in user is attached to `context.locals.user`, so pages can show
who's logged in.

Everything else — including these docs and `/slackphoto` — is ungated.

### 2. Signing in — the `src/pages/api/auth/` endpoints

- **`login.js`** sends the visitor to Slack's authorization page, asking only for
  the `identity.basic` scope.
- **`callback.js`** is where Slack returns them. It exchanges the temporary code
  for a token, asks Slack "who is this?", then creates a session.
- **`logout.js`** clears the session cookie.

### 3. Sessions — `src/lib/auth.js`

A session is a small **signed token** (a JWT) stored in a cookie. "Signed" means
the server stamps it with a secret (your `SLACK_CLIENT_SECRET`) so it can later
verify the cookie hasn't been tampered with. The cookie is `HttpOnly` (JavaScript
can't read it), `Secure` (HTTPS only), and expires after 7 days.

## Following a submission

When the form is submitted, the browser sends the data to
**`src/pages/api/submit.js`**. That one file is the heart of the app. In order, it:

1. **Sets security headers** and a same-origin **CORS** check.
2. **Rate-limits** by IP (10 requests/minute) and rejects oversized requests
   (>100 KB).
3. **Validates and sanitizes** the input against a strict schema — required
   fields, max lengths, a real date — and rejects any unexpected fields.
4. **Appends a row** to the `Conversations` tab (`updateConvoLog`).
5. **Posts a Slack message** announcing the submission, and remembers its
   timestamp so follow-ups can be threaded underneath it.
6. **Reconciles the contact** in the `Eligible` tab (`updateEligible`) and threads
   a "updated" or "not found" message under the first.

### Talking to Google Sheets

Google requires a signed request to hand out an access token. `submit.js` builds a
short-lived **RS256 JWT** from your service-account key, exchanges it at Google's
token endpoint, and then calls the Sheets REST API (`sheetsAPI.get` / `update`).
This is the part that needs Web Crypto.

### Where settings come from

Notice that `submit.js` never hard-codes a sheet ID or channel. It calls
`getConfig(env)` from **`src/lib/config.js`**, which turns environment variables
into a settings object. If you want to change *what* a setting means, that's the
file to edit — see **[Configuration](/docs/configuration)** for the list.

## The form itself — `src/components/FormPage.tsx`

The form is a React component that manages its state with a small **reducer** (a
function that takes the current state plus an action and returns the next state).
The states are `idle → submitting → celebrating → success`, with an `error`
branch. The celebration triggers the confetti animation. Keeping all transitions
in one reducer makes the flow easy to follow and hard to get into an impossible
state.

## The bonus tool — `src/components/SlackPhotoApp.jsx`

`/slackphoto` is an entirely client-side tool for adding a frame to a Slack
profile photo. It doesn't touch the server, Google, or your session — it's
independent, and a good example of an island that needs no backend.

## Map of the project

```
src/
  middleware.js              gate protected routes
  lib/
    auth.js                  sign / verify session cookies (Web Crypto)
    config.js                build settings from env vars
  pages/
    index.astro              the form page (gated)
    slackphoto.astro         the photo tool page
    docs/                    this documentation
    api/
      submit.js              validate → Sheets → Slack
      auth/                  login / callback / logout
  components/
    FormPage.tsx             the form (React)
    Navbar.jsx               top navigation
    SlackPhotoApp.jsx        the photo tool (React)
  layouts/
    DocsLayout.astro         shell for these docs
```

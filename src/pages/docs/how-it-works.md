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
- There's **no UI framework**. The form's interactivity is a plain client
  `<script>` in `FormPage.astro` — vanilla DOM, bundled by Astro/Vite.
- **Tailwind v4** (wired in via the `@tailwindcss/vite` plugin — there's no
  `tailwind.config`; v4 auto-detects classes) provides styling utility classes.
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

Middleware runs before every request. It reads the login cookie and verifies it,
then decides based on the path:

- **Protected pages** (`PROTECTED_PAGES`, default `["/"]`): no valid cookie →
  redirect to `/api/auth/login` (which starts the Slack sign-in). A valid cookie →
  the signed-in user is attached to `context.locals.user` so pages can show who's
  logged in.
- **Protected APIs** (`PROTECTED_APIS`, default `["/api/submit"]`): no valid
  cookie → a `401 Authentication required` JSON response (not a redirect, so a
  `fetch()` from the page can handle it). This stops anyone from POSTing to your
  sheet/Slack without signing in.

### What requires signing in

| Route | Signed-in? | Why |
| --- | --- | --- |
| `/` (the form) | **Required** | Redirects to Slack sign-in if you're not. |
| `/api/submit` | **Required** | Returns 401 without a valid session. |
| `/docs/*` | Public | Documentation; meant to be readable by anyone. |

A note on scope: signing in accepts **any** Slack user who completes the OAuth
flow. It does *not* restrict to your workspace. If you need that, add a check in
`callback.js` comparing the returned team/workspace ID against your own before
creating the session.

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
   (>100 KB). The limiter is in-memory, so on a serverless platform like
   Cloudflare it's best-effort per instance rather than a global guarantee — the
   sign-in gate on this endpoint is the real protection. For hard limits, use
   Cloudflare's rate-limiting rules or a KV/Durable Object counter.
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

## The form itself — `src/components/FormPage.astro`

The form is a plain Astro component: static markup plus a single client
`<script>`. The script wires up submit handling and walks through a small set of
states — submitting → celebrating (confetti) → success, with an `error` branch —
by toggling a couple of message elements and the submit button. No framework, no
hydration, just the DOM.

## Map of the project

```
src/
  middleware.js              gate protected routes
  lib/
    auth.js                  sign / verify session cookies (Web Crypto)
    config.js                build settings from env vars
  pages/
    index.astro              the form page (gated)
    docs/                    this documentation
    api/
      submit.js              validate → Sheets → Slack
      auth/                  login / callback / logout
  components/
    FormPage.astro           the form (markup + client <script>)
    Navbar.astro             top navigation
  layouts/
    DocsLayout.astro         shell for these docs
```

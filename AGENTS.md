# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Copilot, etc.) working in this
repository. Humans: this doubles as a quick orientation — see also the full docs
under `/docs` (start at `src/pages/docs/getting-started.md`).

## What this project is

Sheetbell is an Astro (SSR) + React + Tailwind app deployed on **Cloudflare**. A
Slack-authenticated form logs each submission to a **Google Sheet** and posts a
notification to **Slack**. There's also a standalone client-side "Slack Photo
Flair" tool at `/slackphoto`.

## Commands

```bash
npm install        # install deps (Node 22 — see .nvmrc)
npm run dev        # local dev over HTTPS (Slack OAuth needs HTTPS); default :4321
npm run build      # production build (Cloudflare adapter)
npm run preview     # preview the production build
```

There is no test suite or linter configured. TypeScript uses `astro/tsconfigs/strict`.
After editing, run `npm run build` to catch errors.

## Runtime constraints — read before touching server code

Server code runs in a **Workers-style environment, not Node**:

- Use **Web Crypto** (`crypto.subtle`) and `btoa`/`atob`. Never `node:crypto`,
  `Buffer`, `fs`, or other Node-only APIs. See `src/lib/auth.js` and
  `src/pages/api/submit.js` for the established patterns (HMAC sessions, RS256
  Google JWT).
- Don't rely on long-lived module state (rate-limit counters, caches): instances
  are ephemeral and not shared. For durable state use KV / Durable Objects.
- Every API route / page that must run on each request sets `export const prerender = false;`.

## Configuration — one source of truth

All deployment-specific values come from environment variables, declared with a
schema in `astro.config.mjs` and read through **`src/lib/config.js`** (`getConfig()`).
Values flow via `astro:env/server`, so the SAME code path works in local dev
(reads `.env`) and on Cloudflare (reads platform bindings).

- **Do not hardcode** sheet IDs, channel IDs, tab/column names, or thresholds. Add
  a field to the schema in `astro.config.mjs` and surface it through `getConfig()`.
- Secrets (`SLACK_OAUTH`, `SLACK_CLIENT_SECRET`, `GOOGLE_SERVICE_KEY`) are
  `access: "secret"`; non-secret config is `access: "public"` and usually
  `optional` with a default so a fresh clone still builds.
- Full variable reference: `src/pages/docs/configuration.md`.

## Architecture map

```
src/
  middleware.js              gate the form page (/) and /api/submit
  lib/
    auth.js                  HMAC-signed session cookies (Web Crypto)
    config.js                getConfig() — all settings from env
  pages/
    index.astro              the form page (gated)
    slackphoto.astro         the photo tool (public)
    docs/                    the documentation site (public)
    api/
      submit.js              validate → Google Sheets → Slack  (the core)
      auth/                  login / callback / logout (Slack OAuth)
  components/
    FormPage.tsx             the form (React reducer state machine)
    Navbar.jsx               top nav (takes appName + user)
    SlackPhotoApp.jsx        the photo tool (React)
  layouts/DocsLayout.astro   docs shell
```

### Auth model (what's gated)

`src/middleware.js` gates `/` (redirect to Slack sign-in) and `/api/submit`
(401 JSON without a session). `/slackphoto` and `/docs/*` are public. Sessions are
stateless HMAC-signed JWTs in an HttpOnly cookie (`src/lib/auth.js`), signed with
`SLACK_CLIENT_SECRET`. Sign-in currently accepts any Slack account — there's no
workspace restriction unless you add a team-ID check in `callback.js`.

### The submit pipeline (`src/pages/api/submit.js`)

security headers → same-origin CORS → in-memory rate limit → 100KB cap → strict
input validation → append row to the `Conversations` tab → post Slack message →
reconcile the contact in the optional `Eligible` tab (exact/substring/token, then
Levenshtein fuzzy match) → thread a follow-up Slack message.

## Conventions

- Web component / HTML attributes are kebab-case; JS props are camelCase.
- Prefer small, focused commits with conventional prefixes (`feat:`, `fix:`,
  `docs:`, `chore:`, `refactor:`).
- Keep changes minimal and match surrounding style; don't introduce a framework or
  dependency to solve something the existing patterns already cover.
- Update `src/pages/docs/*` when you change setup, configuration, or behavior the
  docs describe.

## Good first tasks for an agent

- Add a new form field end-to-end (see `.claude/commands/add-field.md`).
- Add a workspace (team-ID) restriction to sign-in in `callback.js`.
- Replace the in-memory rate limiter with a Cloudflare KV / Durable Object counter.
- Make the celebration GIF configurable via env.

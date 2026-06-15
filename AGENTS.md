# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Copilot, etc.) working in this
repository. Humans: this doubles as a quick orientation — see also the full docs
under `/docs` (start at `src/pages/docs/getting-started.md`).

## What this project is

Sheetbell is an Astro (SSR) + Tailwind app deployed on **Cloudflare**. A
Slack-authenticated form logs each submission to a **Google Sheet** and posts a
notification to **Slack**. It's plain Astro — no UI framework; interactivity is a
small client `<script>` on the form.

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
  middleware.js              gate / and /flows (pages) and /api/submit (API)
  lib/
    auth.js                  HMAC-signed session cookies (Web Crypto)
    config.js                getConfig() — all settings from env
    workflow.js              the workflow engine: runner + node registry
    expressions.js           {{ }} template resolver (pure, tested)
    google-sheets.js         Sheets client (token singleton, ok-checks, append)
    slack.js                 chat.postMessage client
    matching.js / validation.js / format.js / rate-limit.js   (pure utils)
  workflows/
    conversation.js          the built-in form workflow, as data
    index.js                 registry (slug → workflow)
  pages/
    index.astro              the form page (gated) — renders the workflow's fields
    flows.astro              read-only workflow visualization (gated)
    docs/                    the documentation site (public)
    api/
      submit.js              runs the primary form workflow
      hooks/[slug].js        webhook trigger: runs a workflow (token-auth)
      auth/                  login / callback / logout (Slack OAuth)
  components/
    FormPage.astro           schema-driven form (markup + a client <script>)
    Navbar.astro             top nav (takes appName + user)
  layouts/DocsLayout.astro   docs shell
```

### Auth model (what's gated)

`src/middleware.js` gates the `/` and `/flows` pages (redirect to Slack sign-in)
and `/api/submit` (401 without a session). `/docs/*` is public. **`/api/hooks/*`
is not session-gated** — webhooks authenticate with the `WEBHOOK_SECRET` token
instead. Sessions are stateless HMAC-signed JWTs in an HttpOnly cookie
(`src/lib/auth.js`), signed with `SLACK_CLIENT_SECRET`. Sign-in accepts any Slack
account unless you add a team-ID check in `callback.js`.

### The workflow engine

The app is a tiny declarative workflow runner (see `/docs/workflows`). `submit.js`
and `hooks/[slug].js` are thin front doors that validate input and call
`runWorkflow()` from `src/lib/workflow.js`, which executes the steps declared in
`src/workflows/*`. A step marked `core` failing → HTTP 502; other steps are
best-effort. Add an integration by adding a node type to the `NODES` map in
`workflow.js`; add a flow by registering a definition in `src/workflows/`.

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

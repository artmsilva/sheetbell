# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, report privately via GitHub's **[Report a vulnerability](https://github.com/artmsilva/sheetbell/security/advisories/new)**
(Security → Advisories → Report a vulnerability). If you can't use that, contact the
maintainer privately through their [GitHub profile](https://github.com/artmsilva).

When reporting, please include:

- A description of the issue and its impact.
- Steps to reproduce (a proof of concept if possible).
- Affected version / commit.

We'll acknowledge your report as soon as we can and keep you updated on the fix.

## Scope and good practices for self-hosters

Sheetbell handles real credentials and writes to your Google Sheet and Slack. When
deploying, please:

- Store `SLACK_CLIENT_SECRET`, `SLACK_OAUTH`, and `GOOGLE_SERVICE_KEY` as **secrets**
  on your host — never commit them. `.env` and `.dev.vars` are gitignored.
- Remember that `SLACK_CLIENT_SECRET` also signs session cookies — rotating it logs
  everyone out.
- By default, sign-in accepts **any** Slack account that completes OAuth. If you
  need to restrict access to your workspace, add a team-ID check in
  `src/pages/api/auth/callback.js` (see `prompts/README.md`).
- The built-in rate limiter is in-memory and best-effort on serverless platforms;
  for hard limits use Cloudflare rate-limiting rules or a KV/Durable Object counter.

## Supported versions

This is a small, pre-1.0 project; security fixes are applied to the latest `main`.

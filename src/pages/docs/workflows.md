---
layout: ../../layouts/DocsLayout.astro
title: Workflows
description: The tiny workflow engine — triggers, steps, templating, and webhooks.
---

# Workflows

Under the hood, Sheetbell isn't a hardcoded "form → sheet → Slack" pipeline — it's
a tiny **workflow engine**. A workflow is a trigger plus an ordered list of steps,
defined as data in `src/workflows/`. The form and the webhook endpoint both just
*run* a workflow. Think of it as a baby [n8n](https://n8n.io): no visual editor,
but the same trigger → steps → integrations shape.

You can see every workflow rendered as a pipeline at **`/flows`** (sign-in required).

Two ship built in:

- **`conversation`** — a *form* trigger (the form at `/`): logs to the
  `Conversations` tab, posts to Slack, reconciles the `Eligible` tab.
- **`alert`** — a *webhook-only* trigger: `POST /api/hooks/alert` with
  `{ "title", "message" }` posts a Slack alert. A minimal example of a non-form
  workflow.

## Anatomy

```js
// src/workflows/conversation.js
export default {
  slug: "conversation",
  name: "Conversation log",
  trigger: {
    type: "form",                 // renders the form at / and validates input
    title: "Record a conversation",
    fields: [
      { name: "contact", label: "Who…?", type: "text", required: true, maxLength: 100 },
      // …
    ],
  },
  steps: [
    { id: "log", type: "sheets.append", core: true,
      tab: "{{config.tabs.conversations}}",
      row: ["{{now}}", "{{organizer}}", "{{contact}}", "{{date | date}}", "{{message}}"] },
    { id: "notify", type: "slack.message", channel: "{{config.slackChannel}}", blocks: [ /* … */ ] },
    { id: "crm", type: "sheets.matchUpdate", tab: "{{config.tabs.eligible}}", match: "{{contact}}",
      set: [{ column: "{{config.columns.engagement}}", value: "{{organizer}} - {{date | date}}" }] },
    { id: "crm_ok", type: "slack.message", when: "{{steps.crm.matched}}", threadTs: "{{steps.notify.ts}}", blocks: [ /* … */ ] },
  ],
};
```

## Templating

Any string in a step config can contain `{{ }}` expressions, resolved against the
run **context**:

- `{{ contact }}` — a trigger field (also `{{ trigger.contact }}`)
- `{{ config.slackChannel }}` — values from [configuration](/docs/configuration)
- `{{ steps.notify.ts }}` — a previous step's output
- `{{ now }}` — the submission timestamp

Filters: `{{ message | escape }}` (Slack-safe), `{{ date | date }}` (MM/DD/YYYY),
`upper`, `lower`. A string that is exactly one token keeps its raw type (so
`when: "{{ steps.crm.matched }}"` is a real boolean).

## Step control

- **`core: true`** — if this step fails, the whole run fails (the form gets a
  `502`; nothing partial is reported as success). Other steps are best-effort:
  a Slack hiccup never fails a row that was already written.
- **`when: "<expr>"`** — run only if the condition is truthy.
- **`unless: "<expr>"`** — run only if it's falsy.

## Node types

| Type | What it does |
| --- | --- |
| `sheets.append` | Append a row to a tab (atomic). `{ tab, row[] }` |
| `sheets.matchUpdate` | Find a contact and set columns on its row. `{ tab, match, set: [{column, value}] }` |
| `slack.message` | Post a message; returns `{ ts }` for threading. `{ channel, blocks, threadTs? }` |
| `http.request` | Outbound HTTP call. `{ url, method?, headers?, body? }` |

Add an integration (email, Discord, Notion, …) by adding one entry to `NODES` in
`src/lib/workflow.js`; every workflow can use it immediately.

## Triggers

- **Form** (`type: "form"`) — the workflow's `fields` render the form at `/` and
  validate the `POST /api/submit` body.
- **Webhook** — every workflow is callable at `POST /api/hooks/<slug>`, secured by
  a shared secret. Enable it by setting `WEBHOOK_SECRET`, then:

  ```bash
  curl -X POST https://your-host/api/hooks/conversation \
    -H "X-Webhook-Token: $WEBHOOK_SECRET" \
    -H "Content-Type: application/json" \
    -d '{"contact":"Acme","organizer":"Sam","date":"2026-01-15","message":"Intro call"}'
  ```

  (Webhooks aren't behind the Slack sign-in — the token is their auth. They're
  disabled until `WEBHOOK_SECRET` is set.)

## Adding a workflow

1. Create `src/workflows/my-flow.js` exporting `{ slug, name, trigger, steps }`.
2. Register it in `src/workflows/index.js`.
3. It's instantly callable at `/api/hooks/my-flow` and shows up on `/flows`. If its
   trigger is a form, it can drive a form page too.

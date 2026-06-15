// POST /api/hooks/<slug> — run a workflow from an external webhook.
//
// Authenticated by a shared `WEBHOOK_SECRET` (header `X-Webhook-Token` or
// `?token=`), not the Slack session — so external services can call it. If
// WEBHOOK_SECRET isn't set, webhooks are disabled.

import { WEBHOOK_SECRET } from "astro:env/server";
import { workflows } from "../../../workflows/index.js";
import { getConfig } from "../../../lib/config.js";
import { createSheetsClient } from "../../../lib/google-sheets.js";
import { validateFields } from "../../../lib/validation.js";
import { runWorkflow, WorkflowCoreError } from "../../../lib/workflow.js";
import { formatTimestamp } from "../../../lib/format.js";

const json = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST({ params, request }) {
  const workflow = workflows[params.slug];
  if (!workflow) return json(404, { error: "Unknown workflow" });

  if (!WEBHOOK_SECRET) {
    return json(503, { error: "Webhooks are disabled. Set WEBHOOK_SECRET to enable." });
  }
  const token =
    request.headers.get("x-webhook-token") ||
    new URL(request.url).searchParams.get("token");
  if (token !== WEBHOOK_SECRET) {
    return json(401, { error: "Invalid or missing webhook token" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  // If the workflow declares input fields, validate against them; otherwise pass
  // the body through to the steps as-is.
  let data = body;
  if (workflow.trigger?.fields?.length) {
    const validation = validateFields(workflow.trigger.fields, body);
    if (!validation.valid) return json(400, { error: validation.error });
    data = validation.data;
  }

  const config = getConfig();
  const services = {
    sheets: createSheetsClient(config.spreadsheetId),
    config,
    env: { SLACK_CHANNEL_ID: config.slackChannel },
    now: formatTimestamp(),
  };

  try {
    const run = await runWorkflow(workflow, data, services);
    return json(200, {
      status: "ok",
      workflow: workflow.slug,
      steps: run.steps.map(({ id, status }) => ({ id, status })),
    });
  } catch (error) {
    if (error instanceof WorkflowCoreError) {
      console.error(error.message);
      return json(502, {
        status: "error",
        message: import.meta.env.PROD ? "Workflow failed." : error.message,
      });
    }
    console.error("Webhook workflow error:", error);
    return json(500, {
      status: "error",
      message: import.meta.env.PROD ? "An unexpected error occurred." : error.message,
    });
  }
}

export const prerender = false;

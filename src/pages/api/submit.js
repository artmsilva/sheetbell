// POST /api/submit — runs the primary form workflow.
//
// This endpoint is the HTTP front door for the form trigger: it does the
// plumbing (CORS, rate limit, size cap, validation) and then hands off to the
// workflow engine, which executes the steps declared in the workflow definition.

import { getConfig } from "../../lib/config.js";
import { createSheetsClient } from "../../lib/google-sheets.js";
import { validateFields } from "../../lib/validation.js";
import { isRateLimited } from "../../lib/rate-limit.js";
import { runWorkflow, WorkflowCoreError } from "../../lib/workflow.js";
import { formatTimestamp } from "../../lib/format.js";
import { primaryFormWorkflow } from "../../workflows/index.js";

const MAX_BODY_BYTES = 100 * 1024;

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

export async function POST(context) {
  const { request } = context;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let isSameOrigin = false;
  try {
    isSameOrigin = Boolean(origin && host && new URL(origin).host === host);
  } catch {
    isSameOrigin = false;
  }
  const corsHeaders = isSameOrigin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      }
    : {};
  const headers = { "Content-Type": "application/json", ...SECURITY_HEADERS, ...corsHeaders };
  const json = (status, payload) => new Response(JSON.stringify(payload), { status, headers });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...corsHeaders } });
  }

  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (isRateLimited(clientIp)) {
    return json(429, { error: "Too many requests, please try again later" });
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return json(413, { error: "Request entity too large" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const validation = validateFields(primaryFormWorkflow.trigger.fields, body);
  if (!validation.valid) return json(400, { error: validation.error });

  const config = getConfig();
  const services = {
    sheets: createSheetsClient(config.spreadsheetId),
    config,
    env: { SLACK_CHANNEL_ID: config.slackChannel },
    now: formatTimestamp(),
  };

  try {
    const run = await runWorkflow(primaryFormWorkflow, validation.data, services);
    return json(200, {
      status: "ok",
      steps: run.steps.map(({ id, status }) => ({ id, status })),
    });
  } catch (error) {
    // The core step (logging the row) failed — nothing durable was written, so a
    // retry is safe. Surface a real failure instead of a misleading success.
    if (error instanceof WorkflowCoreError) {
      console.error(error.message);
      return json(502, {
        status: "error",
        message: import.meta.env.PROD
          ? "Could not save your submission. Please try again."
          : error.message,
      });
    }
    console.error("Unexpected error running workflow:", error);
    return json(500, {
      status: "error",
      message: import.meta.env.PROD ? "An unexpected error occurred." : error.message,
    });
  }
}

export const prerender = false;

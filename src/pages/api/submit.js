// POST /api/submit — orchestrates a conversation submission.
//
// This route is a thin mediator: it validates input, then coordinates the
// domain steps (log to the sheet, reconcile the Eligible tab, notify Slack)
// using the clients in src/lib. The core step (logging the row) determines the
// response; the notification/reconciliation steps are best-effort so a Slack
// hiccup never reports failure for a row that was actually written.

import { env } from "cloudflare:workers";
import { getConfig } from "../../lib/config.js";
import { createSheetsClient } from "../../lib/google-sheets.js";
import { postMessage, escapeMrkdwn } from "../../lib/slack.js";
import { findContactIndex, matchName, columnLetter } from "../../lib/matching.js";
import { validateRequestBody } from "../../lib/validation.js";
import { isRateLimited } from "../../lib/rate-limit.js";

const MAX_BODY_BYTES = 100 * 1024;

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const formatTimestamp = () =>
  new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

// ===== Domain steps =====

/** Append the submission as a new row in the Conversations tab (atomic). */
async function logConversation(sheets, config, data) {
  // Reuse an existing canonical spelling of the contact name if we've logged
  // them before; otherwise use what was submitted.
  const names = await sheets.getValues(`${config.tabs.conversations}!A:A`);
  const contactName =
    names.find((row) => matchName(row[0] || "", data.contact))?.[0] ||
    data.contact;

  await sheets.appendRow(`${config.tabs.conversations}!A1`, [
    formatTimestamp(),
    data.organizer,
    contactName,
    formatDate(data.date),
    data.message,
  ]);
}

/** Stamp the matched contact's row in the Eligible tab. Returns "ok" | "not-found". */
async function reconcileEligible(sheets, config, data) {
  const rows = await sheets.getValues(`${config.tabs.eligible}!A:Z`);
  if (rows.length === 0) return "not-found";

  const index = findContactIndex(
    rows.map((row) => row[0]),
    data.contact,
    config.matching.similarityThreshold
  );
  if (index === -1) return "not-found";

  const header = rows[0];
  const engagementCol = header.findIndex((h) => h === config.columns.engagement);
  const notesCol = header.findIndex((h) => h === config.columns.notes);
  const tab = config.tabs.eligible;
  const rowNum = index + 1;

  if (engagementCol !== -1) {
    await sheets.update(`${tab}!${columnLetter(engagementCol)}${rowNum}`, [
      [`${data.organizer} - ${formatDate(data.date)}`],
    ]);
  }
  if (notesCol !== -1) {
    await sheets.update(`${tab}!${columnLetter(notesCol)}${rowNum}`, [
      [data.message],
    ]);
  }
  return "ok";
}

// ===== Slack notifications (best-effort) =====

function loggedBlocks(data) {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "🎉 New Conversation Logged 🎉", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Organizer:*\n👤 ${escapeMrkdwn(data.organizer)}` },
        { type: "mrkdwn", text: `*Contact:*\n📞 ${escapeMrkdwn(data.contact)}` },
        { type: "mrkdwn", text: `*Date:*\n📅 ${formatDate(data.date)}` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Message:*\n>>> ${escapeMrkdwn(data.message)}` },
    },
  ];
}

const eligibleUpdatedBlocks = () => [
  { type: "section", text: { type: "mrkdwn", text: "✅ *Eligible Sheet Updated* ✅" } },
];

const notFoundBlocks = (data) => [
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `❌ *Contact Not Found* ❌\nThe contact "${escapeMrkdwn(data.contact)}" was not found in the Eligible sheet.`,
    },
  },
];

// ===== HTTP =====

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

export async function POST(context) {
  const { request } = context;

  // Same-origin CORS (Headers is a Headers object — read with .get()).
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
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
        "Access-Control-Max-Age": "86400",
      }
    : {};
  const headers = { "Content-Type": "application/json", ...SECURITY_HEADERS, ...corsHeaders };
  const json = (status, payload) =>
    new Response(JSON.stringify(payload), { status, headers });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...corsHeaders } });
  }

  // Rate limit by Cloudflare's trusted client IP (falls back for other hosts).
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

  const validation = validateRequestBody(body);
  if (!validation.valid) return json(400, { error: validation.error });
  const data = validation.data;

  // Idempotency: when the client sends an Idempotency-Key AND a KV namespace is
  // bound as `IDEMPOTENCY`, replay the stored result for a repeated key instead
  // of writing again (prevents duplicate rows on retries/resubmits). Both are
  // optional — absent either (e.g. local dev), this is a no-op.
  const idempotencyKey = request.headers.get("idempotency-key");
  // KV namespace bound as `IDEMPOTENCY` (Astro v6 reads bindings from
  // `cloudflare:workers`, not `Astro.locals.runtime.env`). Undefined when unbound.
  const idempotencyStore = env.IDEMPOTENCY;
  const idempotencyEnabled = Boolean(idempotencyKey && idempotencyStore);
  if (idempotencyEnabled) {
    try {
      const replay = await idempotencyStore.get(idempotencyKey);
      if (replay) {
        return new Response(replay, {
          status: 200,
          headers: { ...headers, "Idempotency-Replayed": "true" },
        });
      }
    } catch (error) {
      console.error("Idempotency lookup failed:", error.message);
    }
  }

  const config = getConfig();
  const sheets = createSheetsClient(config.spreadsheetId);

  // Core step: logging the row decides the response. Failing here means nothing
  // was written, so a retry is safe (no duplicate).
  try {
    await logConversation(sheets, config, data);
  } catch (error) {
    console.error("Failed to log conversation:", error.message);
    return json(502, {
      status: "error",
      message: import.meta.env.PROD
        ? "Could not save your submission. Please try again."
        : error.message,
    });
  }

  // Secondary steps are best-effort: the row is already saved, so we never turn
  // a notification/reconciliation hiccup into a failure the user would retry.
  let eligible = "skipped";
  let threadTs;
  try {
    threadTs = await postMessage({ channel: config.slackChannel, blocks: loggedBlocks(data) });
  } catch (error) {
    console.error("Slack notify failed:", error.message);
  }
  try {
    eligible = await reconcileEligible(sheets, config, data);
    const followUp = eligible === "ok" ? eligibleUpdatedBlocks() : notFoundBlocks(data);
    await postMessage({ channel: config.slackChannel, blocks: followUp, threadTs });
  } catch (error) {
    console.error("Eligible reconciliation failed:", error.message);
    eligible = "error";
  }

  const result = { status: "ok", logged: true, eligible };

  // Record the successful submission so a retry with the same key replays this
  // result instead of writing again. Stored only on success, so a failed write
  // can still be retried. TTL bounds the dedup window.
  if (idempotencyEnabled) {
    try {
      await idempotencyStore.put(idempotencyKey, JSON.stringify(result), {
        expirationTtl: 60 * 60 * 24, // 24 hours
      });
    } catch (error) {
      console.error("Idempotency store failed:", error.message);
    }
  }

  return json(200, result);
}

export const prerender = false;

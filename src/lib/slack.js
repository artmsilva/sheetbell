// Slack chat.postMessage client. Checks both the HTTP status and the Slack
// `ok` flag, and provides escaping for user-controlled text.

import { SLACK_OAUTH } from "astro:env/server";

/**
 * Escape text before placing it in a Slack `mrkdwn` block, so user input can't
 * inject mentions/links like `<!channel>`, `<@U…>`, or `<http…|click>`.
 * See https://api.slack.com/reference/surfaces/formatting#escaping
 */
export const escapeMrkdwn = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Post a message to a channel. Returns the message `ts` (usable as a thread
 * parent). Throws on transport, HTTP, or Slack API errors.
 */
export async function postMessage({ channel, blocks, threadTs }) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${SLACK_OAUTH}`,
    },
    body: JSON.stringify({ channel, thread_ts: threadTs, blocks }),
  });
  if (!res.ok) {
    throw new Error(`Slack request failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
  return data.ts;
}

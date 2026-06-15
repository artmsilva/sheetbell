// Slack chat.postMessage client. Checks both the HTTP status and the Slack
// `ok` flag. (Escaping lives in format.js so it's usable without this module's
// astro:env import.)

import { SLACK_OAUTH } from "astro:env/server";

export { escapeMrkdwn } from "./format.js";

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

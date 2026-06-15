// Date/time formatting shared by the workflow engine and request handlers.
// Note: runs in the deployment's timezone (UTC on Cloudflare).

export const formatDate = (date) => {
  // A plain calendar date (YYYY-MM-DD) is formatted from its parts so it doesn't
  // shift a day across timezones (new Date("YYYY-MM-DD") is parsed as UTC).
  const ymd = typeof date === "string" && date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${ymd[2]}/${ymd[3]}/${ymd[1]}`;
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const formatTimestamp = () =>
  new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

/**
 * Escape text before placing it in a Slack `mrkdwn` block, so user input can't
 * inject mentions/links like `<!channel>`, `<@U…>`, or `<http…|click>`.
 * https://api.slack.com/reference/surfaces/formatting#escaping
 */
export const escapeMrkdwn = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

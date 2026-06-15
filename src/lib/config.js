// Runtime configuration, built from environment variables with sensible
// defaults. Everything that is deployment-specific (sheet IDs, Slack channels,
// tab and column names, matching thresholds) lives here so the app can be
// self-hosted without touching code.
//
// `env` is the runtime environment object — on Cloudflare this is
// `context.locals.runtime.env`, with `import.meta.env` as a local-dev fallback.

const num = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function getConfig(env) {
  // `env.PROD` is set by the caller (true in production deployments). It selects
  // the production vs. test spreadsheet and Slack channel so you can dry-run
  // against a scratch sheet/channel before going live.
  const isProd = Boolean(env.PROD);

  const spreadsheetId = isProd
    ? env.SPREADSHEET_ID
    : env.SPREADSHEET_ID_TEST || env.SPREADSHEET_ID;

  const slackChannel = isProd
    ? env.SLACK_CHANNEL_ID
    : env.SLACK_CHANNEL_ID_TEST || env.SLACK_CHANNEL_ID;

  return {
    appName: env.APP_NAME || "Sheetbell",
    spreadsheetId,
    slackChannel,
    tabs: {
      conversations: env.SHEET_TAB_CONVERSATIONS || "Conversations",
      eligible: env.SHEET_TAB_ELIGIBLE || "Eligible",
    },
    // Header text used to locate columns in the Eligible tab. Match these to
    // your sheet's header row exactly. Leave the Eligible feature unused by
    // simply not creating that tab — the update is skipped when the row/column
    // is not found.
    columns: {
      engagement:
        env.ELIGIBLE_ENGAGEMENT_COLUMN || "Last engagement / who did it",
      notes: env.ELIGIBLE_NOTES_COLUMN || "Last Conversation Notes",
    },
    matching: {
      // Levenshtein-based fuzzy-match cutoff (0–1) for reconciling a submitted
      // contact name against the Eligible tab. Higher = stricter.
      similarityThreshold: num(env.MATCH_SIMILARITY_THRESHOLD, 0.7),
    },
  };
}

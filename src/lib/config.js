// Runtime configuration, built from environment variables with sensible
// defaults. Everything that is deployment-specific (sheet IDs, Slack channels,
// tab and column names, matching thresholds) lives here so the app can be
// self-hosted without touching code.
//
// Values come from `astro:env/server`, which reads your `.env` file during
// local development and the platform's environment bindings in production
// (e.g. Cloudflare). Defaults are declared in the schema in `astro.config.mjs`,
// so the optional values below are never undefined.

import {
  SPREADSHEET_ID,
  SPREADSHEET_ID_TEST,
  SLACK_CHANNEL_ID,
  SLACK_CHANNEL_ID_TEST,
  APP_NAME,
  SHEET_TAB_CONVERSATIONS,
  SHEET_TAB_ELIGIBLE,
  ELIGIBLE_ENGAGEMENT_COLUMN,
  ELIGIBLE_NOTES_COLUMN,
  MATCH_SIMILARITY_THRESHOLD,
} from "astro:env/server";

export function getConfig() {
  // `import.meta.env.PROD` is true in production builds. It selects the
  // production vs. test spreadsheet and Slack channel so you can dry-run
  // against a scratch sheet/channel before going live.
  const isProd = import.meta.env.PROD;

  const spreadsheetId = isProd
    ? SPREADSHEET_ID
    : SPREADSHEET_ID_TEST || SPREADSHEET_ID;

  const slackChannel = isProd
    ? SLACK_CHANNEL_ID
    : SLACK_CHANNEL_ID_TEST || SLACK_CHANNEL_ID;

  return {
    appName: APP_NAME,
    spreadsheetId,
    slackChannel,
    tabs: {
      conversations: SHEET_TAB_CONVERSATIONS,
      eligible: SHEET_TAB_ELIGIBLE,
    },
    // Header text used to locate columns in the Eligible tab. Match these to
    // your sheet's header row exactly. The Eligible update is skipped when the
    // tab, the contact, or the column is not found — so you can leave the tab
    // out entirely if you don't need it.
    columns: {
      engagement: ELIGIBLE_ENGAGEMENT_COLUMN,
      notes: ELIGIBLE_NOTES_COLUMN,
    },
    matching: {
      // Levenshtein-based fuzzy-match cutoff (0–1) for reconciling a submitted
      // contact name against the Eligible tab. Higher = stricter.
      similarityThreshold: MATCH_SIMILARITY_THRESHOLD,
    },
  };
}

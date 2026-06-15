// @ts-check
import { envField, defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  output: "server",
  adapter: cloudflare(),
  vite: {
    plugins: [basicSsl()],
  },
  env: {
    schema: {
      // ── Secrets (validated at runtime, not build) ──
      SLACK_OAUTH: envField.string({ context: "server", access: "secret" }),
      SLACK_CLIENT_SECRET: envField.string({ context: "server", access: "secret" }),
      GOOGLE_SERVICE_KEY: envField.string({ context: "server", access: "secret" }),

      // ── Public, server-only config (validated at build) ──
      // Marked optional so a fresh clone builds before anything is configured.
      SLACK_CLIENT_ID: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      SPREADSHEET_ID: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      SPREADSHEET_ID_TEST: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      SLACK_CHANNEL_ID: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      SLACK_CHANNEL_ID_TEST: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),

      // ── Optional customization (with defaults) ──
      APP_NAME: envField.string({
        context: "server",
        access: "public",
        default: "Sheetbell",
      }),
      SHEET_TAB_CONVERSATIONS: envField.string({
        context: "server",
        access: "public",
        default: "Conversations",
      }),
      SHEET_TAB_ELIGIBLE: envField.string({
        context: "server",
        access: "public",
        default: "Eligible",
      }),
      ELIGIBLE_ENGAGEMENT_COLUMN: envField.string({
        context: "server",
        access: "public",
        default: "Last engagement / who did it",
      }),
      ELIGIBLE_NOTES_COLUMN: envField.string({
        context: "server",
        access: "public",
        default: "Last Conversation Notes",
      }),
      MATCH_SIMILARITY_THRESHOLD: envField.number({
        context: "server",
        access: "public",
        default: 0.7,
      }),
    },
  },
});

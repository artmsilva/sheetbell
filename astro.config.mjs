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
      SLACK_OAUTH: envField.string({ context: "server", access: "secret" }),
      // Public vars are validated at build time; mark optional so the project
      // (and these docs) build on a fresh clone before secrets are configured.
      SLACK_CLIENT_ID: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      SLACK_CLIENT_SECRET: envField.string({ context: "server", access: "secret" }),
      GOOGLE_SERVICE_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
    },
  },
});

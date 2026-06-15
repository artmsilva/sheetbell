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
      SLACK_CLIENT_ID: envField.string({ context: "server", access: "public" }),
      SLACK_CLIENT_SECRET: envField.string({ context: "server", access: "secret" }),
      GOOGLE_SERVICE_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
    },
  },
});

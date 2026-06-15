// Static build of the documentation site for GitHub Pages.
//
// The main app (astro.config.mjs) is server-rendered on Cloudflare and can't be
// statically exported because of its API routes and gated pages. This config
// builds ONLY the docs as static HTML, from an isolated source tree assembled by
// the Pages workflow (see .github/workflows/pages.yml) into `.pages-src/` — so
// there's a single source of truth (the real docs) and no duplicated content.
//
// GitHub project pages serve under a sub-path (`/<repo>`), set via PAGES_BASE.

import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

const base = process.env.PAGES_BASE || "/sheetbell";
const site = process.env.PAGES_SITE || "https://artmsilva.github.io";

// Rehype plugin: prefix internal absolute links (e.g. "/docs/getting-started")
// in the rendered markdown with the base path so they resolve under /<repo>.
// Leaves external links, anchors, and already-prefixed links alone.
function rehypeBaseInternalLinks() {
  const prefix = (href) => {
    if (typeof href !== "string") return href;
    if (!href.startsWith("/") || href.startsWith("//")) return href; // external/protocol-relative
    if (href === base || href.startsWith(base + "/")) return href; // already based
    return base + href;
  };
  const walk = (node) => {
    if (node.type === "element" && node.tagName === "a" && node.properties) {
      node.properties.href = prefix(node.properties.href);
    }
    if (node.children) node.children.forEach(walk);
  };
  return (tree) => walk(tree);
}

export default defineConfig({
  output: "static",
  site,
  base,
  srcDir: "./.pages-src",
  outDir: "./dist-pages",
  publicDir: "./public",
  vite: {
    plugins: [tailwindcss()],
  },
  // Land the site root on the docs overview. (Astro doesn't apply `base` to
  // redirect targets, so include it explicitly.)
  redirects: {
    "/": `${base}/docs`,
  },
  markdown: {
    rehypePlugins: [rehypeBaseInternalLinks],
  },
});

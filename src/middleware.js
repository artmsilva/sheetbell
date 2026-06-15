import { SLACK_CLIENT_SECRET } from "astro:env/server";
import { verifySession, parseCookie, COOKIE_NAME } from "./lib/auth.js";

// Pages that require Slack authentication. An unauthenticated visitor is sent
// to sign in with Slack.
const PROTECTED_PAGES = ["/"];

// API routes that require authentication. These return 401 JSON instead of
// redirecting, so a fetch() from the page can handle the failure cleanly.
const PROTECTED_APIS = ["/api/submit"];

export async function onRequest(context, next) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  const isProtectedPage = PROTECTED_PAGES.includes(path);
  const isProtectedApi = PROTECTED_APIS.includes(path);
  if (!isProtectedPage && !isProtectedApi) return next();

  const cookieHeader = context.request.headers.get("cookie");
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  const user = token ? await verifySession(SLACK_CLIENT_SECRET, token) : null;

  if (!user) {
    if (isProtectedApi) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return context.redirect("/api/auth/login");
  }

  // Attach user info so pages and endpoints can access it.
  context.locals.user = user;

  return next();
}

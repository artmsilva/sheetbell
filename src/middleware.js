import { SLACK_CLIENT_SECRET } from "astro:env/server";
import { verifySession, parseCookie, COOKIE_NAME } from "./lib/auth.js";

// Routes that require Slack authentication
const PROTECTED_ROUTES = ["/"];

export async function onRequest(context, next) {
  const url = new URL(context.request.url);

  // Only gate exact protected routes
  const isProtected = PROTECTED_ROUTES.includes(url.pathname);
  if (!isProtected) return next();

  const cookieHeader = context.request.headers.get("cookie");
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  const user = token ? await verifySession(SLACK_CLIENT_SECRET, token) : null;

  if (!user) {
    return context.redirect("/api/auth/login");
  }

  // Attach user info so pages can access it
  context.locals.user = user;

  return next();
}

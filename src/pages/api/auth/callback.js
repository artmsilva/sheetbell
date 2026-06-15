import { SLACK_CLIENT_ID, SLACK_CLIENT_SECRET } from "astro:env/server";
import { createSession, sessionCookieHeader } from "../../../lib/auth.js";

export async function GET(context) {
  const url = new URL(context.request.url);
  const origin = url.origin.replace("http://", "https://");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    console.error("Slack OAuth error:", error);
    return new Response("Authentication failed. Please try again.", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const redirectUri = `${origin}/api/auth/callback`;

  // Exchange code for access token
  const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.ok) {
    console.error("Slack token exchange failed:", tokenData.error);
    return new Response("Authentication failed. Please try again.", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // For Sign in with Slack (identity.basic scope), user info is in authed_user
  // Fetch identity using the user token
  const userToken = tokenData.authed_user?.access_token;
  if (!userToken) {
    console.error("No user access token returned from Slack");
    return new Response("Authentication failed. Please try again.", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const identityResponse = await fetch(
    "https://slack.com/api/users.identity",
    {
      headers: { Authorization: `Bearer ${userToken}` },
    }
  );

  const identity = await identityResponse.json();

  if (!identity.ok) {
    console.error("Slack identity fetch failed:", identity.error);
    return new Response("Authentication failed. Please try again.", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const userData = {
    slackId: identity.user.id,
    name: identity.user.name,
    teamId: identity.team?.id,
  };

  const token = await createSession(SLACK_CLIENT_SECRET, userData);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": sessionCookieHeader(token),
    },
  });
}

export const prerender = false;

import { SLACK_CLIENT_ID } from "astro:env/server";

export async function GET(context) {
  const url = new URL(context.request.url);
  const origin = url.origin.replace("http://", "https://");
  const redirectUri = `${origin}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    user_scope: "identity.basic",
    redirect_uri: redirectUri,
  });

  return context.redirect(
    `https://slack.com/oauth/v2/authorize?${params.toString()}`
  );
}

export const prerender = false;

import { sessionCookieHeader } from "../../../lib/auth.js";

export async function GET() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": sessionCookieHeader("deleted", { clear: true }),
    },
  });
}

export const prerender = false;

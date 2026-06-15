// Session management via HMAC-signed JWT stored in an HTTP-only cookie.
// Works on Cloudflare Workers (no Node.js crypto needed).

const COOKIE_NAME = "sheetbell_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

const base64UrlEncode = (str) =>
  btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const base64UrlDecode = (str) => {
  const padded = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  return atob(padded);
};

async function getSigningKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Create a signed session token containing user data.
 */
export async function createSession(secret, userData) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      ...userData,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
    })
  );

  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  );
  const signature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(sig))
  );

  return `${header}.${payload}.${signature}`;
}

/**
 * Verify and decode a session token. Returns the payload or null.
 */
export async function verifySession(secret, token) {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;

  try {
    const key = await getSigningKey(secret);
    const sigBytes = Uint8Array.from(base64UrlDecode(signature), (c) =>
      c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(`${header}.${payload}`)
    );

    if (!valid) return null;

    const data = JSON.parse(base64UrlDecode(payload));

    // Check expiration
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Parse a specific cookie from a Cookie header string.
 */
export function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Build a Set-Cookie header value for the session.
 */
export function sessionCookieHeader(token, { clear = false } = {}) {
  const maxAge = clear ? 0 : SESSION_MAX_AGE;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;
}

export { COOKIE_NAME };

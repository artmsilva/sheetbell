// Minimal Google Sheets v4 client for the Workers runtime.
//
// Authenticates as a service account using a hand-rolled RS256 JWT (Web Crypto —
// no Node deps), then talks to the Sheets REST API. Every request checks
// response.ok and throws a descriptive error, so failures surface clearly
// instead of turning into `undefined` downstream.

import { GOOGLE_SERVICE_KEY } from "astro:env/server";

const base64UrlEncode = (str) =>
  btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const signRS256 = async (data, privateKey) => {
  const pem = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(data)
  );
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(sig)));
};

const createJWT = async (credentials) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64UrlEncode(
    JSON.stringify({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const input = `${header}.${claim}`;
  return `${input}.${await signRS256(input, credentials.private_key)}`;
};

const fetchAccessToken = async () => {
  let credentials;
  try {
    credentials = JSON.parse(GOOGLE_SERVICE_KEY);
  } catch (error) {
    throw new Error(`Failed to parse GOOGLE_SERVICE_KEY: ${error.message}`);
  }
  const jwt = await createJWT(credentials);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token request failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Google token response did not include an access_token");
  }
  return data.access_token;
};

const valuesUrl = (spreadsheetId, range) =>
  `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

/**
 * Create a Sheets client bound to one spreadsheet. The access token is fetched
 * once and reused for the client's lifetime (one request) — a request-scoped
 * singleton, so a submit that touches the sheet several times pays for auth once.
 */
export function createSheetsClient(spreadsheetId) {
  let tokenPromise = null;
  const authHeader = async () => {
    tokenPromise ??= fetchAccessToken();
    return { Authorization: `Bearer ${await tokenPromise}` };
  };

  return {
    /** Read a range; returns the 2-D values array (never undefined). */
    async getValues(range) {
      const res = await fetch(valuesUrl(spreadsheetId, range), {
        headers: await authHeader(),
      });
      if (!res.ok) {
        throw new Error(`Sheets read '${range}' failed (${res.status}): ${await res.text()}`);
      }
      const data = await res.json();
      return data.values ?? [];
    },

    /** Atomically append a row to the table at `range` (no read-then-write race). */
    async appendRow(range, row) {
      const url =
        `${valuesUrl(spreadsheetId, range)}:append` +
        `?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
      const res = await fetch(url, {
        method: "POST",
        headers: { ...(await authHeader()), "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row] }),
      });
      if (!res.ok) {
        throw new Error(`Sheets append '${range}' failed (${res.status}): ${await res.text()}`);
      }
      return res.json();
    },

    /** Overwrite a range with `values` (a 2-D array). */
    async update(range, values) {
      const res = await fetch(`${valuesUrl(spreadsheetId, range)}?valueInputOption=RAW`, {
        method: "PUT",
        headers: { ...(await authHeader()), "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) {
        throw new Error(`Sheets update '${range}' failed (${res.status}): ${await res.text()}`);
      }
      return res.json();
    },
  };
}

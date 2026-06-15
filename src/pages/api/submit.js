// Google Sheets API helper
const getAccessToken = async (env) => {
  const serviceKey = env.GOOGLE_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error("GOOGLE_SERVICE_KEY environment variable is not set");
  }
  
  let credentials;
  try {
    credentials = JSON.parse(serviceKey);
  } catch (error) {
    throw new Error(`Failed to parse GOOGLE_SERVICE_KEY: ${error.message}`);
  }
  
  const jwt = await createJWT(credentials);
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  
  const data = await response.json();
  return data.access_token;
};

const createJWT = async (credentials) => {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;
  
  const signature = await signRS256(signatureInput, credentials.private_key);
  return `${signatureInput}.${signature}`;
};

const base64UrlEncode = (str) => {
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const signRS256 = async (data, privateKey) => {
  const pemKey = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(data)
  );
  
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
};

const sheetsAPI = {
  async get(env, spreadsheetId, range) {
    const token = await getAccessToken(env);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.json();
  },
  
  async update(env, spreadsheetId, range, values) {
    const token = await getAccessToken(env);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      }
    );
    return response.json();
  },
};

/**
 * Send a message to Slack
 */
const sendSlackMessage = async (env, { blocks, threadTs }) => {
  const config = getConfig(env);
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${env.SLACK_OAUTH}`,
      },
      body: JSON.stringify({
        channel: config.slackChannel,
        thread_ts: threadTs,
        blocks: blocks,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Slack API error response:", errorText);
      throw new Error(`Slack API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data.ok) {
      console.error("Slack API returned error:", data);
      throw new Error(`Slack API error: ${data.error}`);
    }

    console.log("Slack message sent successfully:", data);
    return data.ts;
  } catch (error) {
    console.error("Failed to send Slack message:", error.message);
    throw error; // Re-throw so caller knows it failed
  }
};


// ===== Utility Functions =====

/**
 * Normalize a name by removing special characters and standardizing format
 */
const normalizeName = (name) =>
  name
    .replace(/[_\W]+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

/**
 * Check if two names match using various criteria
 */
const matchName = (sheetName, inputName) => {
  const a = normalizeName(sheetName);
  const b = normalizeName(inputName);

  // Exact or substring match
  if (a === b || a.includes(b) || b.includes(a)) {
    return true;
  }
  // All tokens in b appear in a
  return b.split(" ").every((token) => a.split(" ").includes(token));
};

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (str1, str2) => {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    track[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return track[str2.length][str1.length];
};

/**
 * Calculate similarity between two strings (0-1 where 1 is exact match)
 */
const stringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  return 1.0 - levenshteinDistance(str1, str2) / maxLength;
};

/**
 * Format a date as MM/DD/YYYY
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/**
 * Format current timestamp as MM/DD/YYYY HH:MM AM/PM
 */
const formatTimestamp = () => {
  return new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

// ===== Communication Functions =====

// ===== Spreadsheet Operations =====

/**
 * Update the conversation log with new conversation details
 */
const updateConvoLog = async (env, { body }) => {
  const config = getConfig(env);
  try {
    const { contact, organizer, date, message } = body;
    const spreadsheetId = config.spreadsheetId;

    const range = `${config.tabs.conversations}!A:B`;

    const res = await sheetsAPI.get(env, spreadsheetId, range);

    const rows = res.values;
    const contactName =
      rows.find((row) => matchName(row[0] || "", contact))?.[0] || contact;

    const newRow = [
      formatTimestamp(),
      organizer,
      contactName,
      formatDate(date),
      message,
    ];

    const newRange = `${config.tabs.conversations}!A${
      rows.length + 1
    }:E${rows.length + 1}`;

    await sheetsAPI.update(env, spreadsheetId, newRange, [newRow]);

    console.log("Conversation log updated successfully");
    return "ok";
  } catch (error) {
    console.error("Error updating conversation log:", error);
  }
};

/**
 * Find a contact in the eligible tab using both exact and fuzzy matching
 */
const findContactInEligibleTab = async (env, contact) => {
  const config = getConfig(env);
  const spreadsheetId = config.spreadsheetId;
  // Get all data from the Eligible tab
  const sheet2Range = `${config.tabs.eligible}!A:Z`;
  const sheet2Res = await sheetsAPI.get(env, spreadsheetId, sheet2Range);

  const sheet2Rows = sheet2Res.values;
  const sheet2ContactNames = sheet2Rows.map((row) => row[0]);

  console.log("Looking for contact:", contact);

  // Try exact match first
  const contactIndex = sheet2ContactNames.findIndex((name) =>
    matchName(name || "", contact)
  );

  // If not found with regular matching, try fuzzy matching
  if (contactIndex === 0 || contactIndex === -1) {
    console.log(
      "Contact not found with regular matching, trying fuzzy matching"
    );
    const normalizedInput = normalizeName(contact);

    let bestMatchIndex = -1;
    let bestMatchScore = 0;

    // Skip header row (index 0)
    for (let i = 1; i < sheet2ContactNames.length; i++) {
      const normalizedName = normalizeName(sheet2ContactNames[i] || "");
      const score = stringSimilarity(normalizedInput, normalizedName);

      if (
        score > config.matching.similarityThreshold &&
        score > bestMatchScore
      ) {
        bestMatchScore = score;
        bestMatchIndex = i;
      }
    }

    if (bestMatchIndex !== -1) {
      console.log(
        `Found fuzzy match: ${sheet2ContactNames[bestMatchIndex]} (score: ${bestMatchScore})`
      );
      return {
        matchedIndex: bestMatchIndex,
        sheet2Rows,
        matchedName: sheet2ContactNames[bestMatchIndex],
      };
    } else {
      return { matchedIndex: -1, sheet2Rows, matchedName: null };
    }
  }

  return {
    matchedIndex: contactIndex,
    sheet2Rows,
    matchedName: sheet2ContactNames[contactIndex],
  };
};

/**
 * Update the Eligible tab with engagement information
 */
const updateEligible = async (env, { body }) => {
  const config = getConfig(env);
  try {
    const { contact, organizer, date, message } = body;
    const spreadsheetId = config.spreadsheetId;

    const { matchedIndex, sheet2Rows, matchedName } =
      await findContactInEligibleTab(env, contact);

    if (matchedIndex === -1) {
      console.log(
        "Contact name not found in eligible tab, even with fuzzy matching"
      );
      return "not-found";
    }

    const sheet2HeaderRow = sheet2Rows[0];

    // Update the engagement column
    const lastEngagementIndex = sheet2HeaderRow.findIndex(
      (header) => header === config.columns.engagement
    );

    if (lastEngagementIndex !== -1) {
      const updateRange = `${
        config.tabs.eligible
      }!${String.fromCharCode(65 + lastEngagementIndex)}${matchedIndex + 1}`;

      await sheetsAPI.update(env, spreadsheetId, updateRange, [
        [`${organizer} - ${formatDate(date)}`],
      ]);
    }

    // Update the conversation-notes column
    const notesIndex = sheet2HeaderRow.findIndex(
      (header) => header === config.columns.notes
    );

    if (notesIndex !== -1) {
      const updateRange = `${
        config.tabs.eligible
      }!${String.fromCharCode(65 + notesIndex)}${matchedIndex + 1}`;

      await sheetsAPI.update(env, spreadsheetId, updateRange, [[message]]);
    }

    return "ok";
  } catch (error) {
    console.error("Error updating eligible tab:", error);
    return false;
  }
};

// Simple in-memory rate limiter
const rateLimiter = {
  requests: {},
  maxRequests: 10, // Maximum requests per minute
  resetInterval: 60 * 1000, // 1 minute in milliseconds

  isRateLimited(ip) {
    const now = Date.now();
    if (!this.requests[ip]) {
      this.requests[ip] = { count: 1, firstRequest: now };
      return false;
    }

    const windowExpired =
      now - this.requests[ip].firstRequest > this.resetInterval;

    if (windowExpired) {
      this.requests[ip] = { count: 1, firstRequest: now };
      return false;
    }

    this.requests[ip].count += 1;
    return this.requests[ip].count > this.maxRequests;
  },

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    Object.keys(this.requests).forEach((ip) => {
      if (now - this.requests[ip].firstRequest > this.resetInterval) {
        delete this.requests[ip];
      }
    });
  },
};

/**
 * Validate request body against schema
 */
const validateRequestBody = (body) => {
  // Define schema
  const schema = {
    contact: {
      type: "string",
      required: true,
      maxLength: 100,
      sanitize: (val) => String(val).trim(),
    },
    organizer: {
      type: "string",
      required: true,
      maxLength: 100,
      sanitize: (val) => String(val).trim(),
    },
    date: {
      type: "date",
      required: true,
      validate: (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
    },
    message: {
      type: "string",
      required: true,
      maxLength: 5000,
      sanitize: (val) => String(val).trim(),
    },
  };

  // Check for unexpected fields (potential injection vectors)
  const allowedFields = Object.keys(schema);
  const unexpectedFields = Object.keys(body).filter(
    (key) => !allowedFields.includes(key)
  );

  if (unexpectedFields.length > 0) {
    return {
      valid: false,
      error: `Unexpected fields in request: ${unexpectedFields.join(", ")}`,
    };
  }

  // Validate required fields and collect sanitized data
  const sanitizedData = {};
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    // Check if field exists when required
    if (rules.required && (body[field] === undefined || body[field] === null)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    // Skip validation for optional fields that aren't present
    if (!rules.required && body[field] === undefined) {
      continue;
    }

    const value = body[field];

    // Type validation
    if (rules.type === "string" && typeof value !== "string") {
      errors.push(`Field '${field}' must be a string`);
    }

    // Length validation for strings
    if (
      rules.type === "string" &&
      typeof value === "string" &&
      rules.maxLength &&
      value.length > rules.maxLength
    ) {
      errors.push(
        `Field '${field}' exceeds maximum length of ${rules.maxLength} characters`
      );
    }

    // Custom validation (like date)
    if (rules.validate && !rules.validate(value)) {
      errors.push(`Invalid value for field '${field}'`);
    }

    // Sanitize if needed
    if (rules.sanitize) {
      sanitizedData[field] = rules.sanitize(value);
    } else {
      sanitizedData[field] = value;
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join("; "),
    };
  }

  // Return both validation status and sanitized data
  return {
    valid: true,
    sanitizedData,
  };
};

/**
 * Main request handler
 */
export async function POST(context) {
  const request = context.request;
  const response = new Response();
  
  // Get environment variables from context
  // For Cloudflare Pages: context.locals.runtime.env
  // For local dev with import.meta.env as fallback
  const runtimeEnv = context.locals?.runtime?.env || import.meta.env;
  
  // Add PROD flag - check for CF_PAGES or if MODE is production
  const env = {
    ...runtimeEnv,
    PROD: runtimeEnv.CF_PAGES === "1" || runtimeEnv.MODE === "production" || import.meta.env.PROD
  };
  
  try {
    // Set security headers
    const headers = new Headers({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security":
        "max-age=63072000; includeSubDomains; preload",
    });

    // CORS handling: allow same-origin requests only
    const origin = request.headers.origin;
    const host = request.headers.host;

    // Check if it's same origin (host matches origin)
    const isSameOrigin = origin && origin.includes(host);

    if (isSameOrigin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
      headers.set("Access-Control-Max-Age", "86400");
      console.log(`CORS allowed for same origin: ${origin}, host: ${host}`);
    }

    // Handle CORS headers for preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: response.headers,
      });
    }

    // Rate limiting check
    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (rateLimiter.isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({
          error: "Too many requests, please try again later",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check request size
    const contentLength = parseInt(request.headers["content-length"] || "0");
    if (contentLength > 100 * 1024) {
      // 100KB limit
      return new Response(
        JSON.stringify({
          error: "Request entity too large",
        }),
        {
          status: 413,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await request.json();
    console.log("Processing request body:", body);

    // Validate request body
    const validation = validateRequestBody(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // create thread_ts variable so we can use it later
    let threadTs = null;

    // Use sanitized data for processing
    const convoLogResponse = await updateConvoLog(env, {
      body: validation.sanitizedData,
    });

    const { contact, organizer, date, message } = validation.sanitizedData;

    const giphyUrls = [
      "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif",
    ];

    const randomGiphyUrl =
      giphyUrls[Math.floor(Math.random() * giphyUrls.length)];

    threadTs =
      convoLogResponse === "ok" &&
      (await sendSlackMessage(env, {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🎉 New Conversation Logged 🎉",
              emoji: true,
            },
          },
          {
            type: "image",
            image_url: randomGiphyUrl,
            alt_text: "Celebration",
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Organizer:*\n👤 ${organizer}`,
              },
              {
                type: "mrkdwn",
                text: `*Contact:*\n📞 ${contact}`,
              },
              {
                type: "mrkdwn",
                text: `*Date:*\n📅 ${formatDate(date)}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Message:*\n>>> ${message}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "✨ The conversation log has been updated in the spreadsheet. ✨",
              },
            ],
          },
        ],
      }));

    const updateEligibleResponse = await updateEligible(env, {
      body: validation.sanitizedData,
    });

    if (updateEligibleResponse === "ok") {
      await sendSlackMessage(env, {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "✅ *Eligible Sheet Updated* ✅",
            },
          },
          {
            type: "divider",
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "The contact's information has been updated in the Eligible sheet.",
              },
            ],
          },
        ],
        threadTs,
      });
    } else if (updateEligibleResponse === "not-found") {
      await sendSlackMessage(env, {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "❌ *Contact Not Found* ❌",
            },
          },
          {
            type: "divider",
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `The contact "${contact}" was not found in the Eligible sheet.`,
              },
            ],
          },
        ],
        threadTs,
      });
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Form submitted successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    // Don't expose error details in production
    const errorMessage = env.PROD
      ? "An error occurred while processing your request"
      : error.message;

    return new Response(
      JSON.stringify({
        status: "error",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

export const prerender = false;

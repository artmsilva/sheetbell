// Best-effort in-memory rate limiter.
//
// CAVEAT: on a serverless platform like Cloudflare, module state is per-isolate
// and isolates are ephemeral, so this is NOT a global guarantee — it only blunts
// bursts within a single isolate. The real protection on this endpoint is the
// Slack sign-in gate (see middleware.js). For a hard limit, use Cloudflare's
// Rate Limiting rules or a Durable Object / KV counter.

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

const hits = new Map(); // key -> { count, windowStart }

export function isRateLimited(key, now = Date.now()) {
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    sweep(now);
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

// Opportunistic cleanup so the map can't grow without bound in a long-lived isolate.
function sweep(now) {
  if (hits.size < 1000) return;
  for (const [key, entry] of hits) {
    if (now - entry.windowStart > WINDOW_MS) hits.delete(key);
  }
}

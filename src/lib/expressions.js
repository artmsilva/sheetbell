// Tiny template-expression resolver for workflow definitions.
//
// Supports `{{ path.to.value }}` lookups against a context object, with optional
// pipe filters: `{{ message | escape }}`, `{{ date | date }}`. A string that is
// exactly one token returns the raw resolved value (preserving type, e.g. a
// boolean for `when` conditions); otherwise tokens are interpolated as strings.

import { escapeMrkdwn, formatDate } from "./format.js";

const FILTERS = {
  escape: (v) => escapeMrkdwn(v),
  date: (v) => formatDate(v),
  upper: (v) => String(v).toUpperCase(),
  lower: (v) => String(v).toLowerCase(),
};

const TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;
const WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;

const getPath = (ctx, path) =>
  path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), ctx);

const evalExpr = (expr, ctx) => {
  const [path, ...filters] = expr.split("|").map((s) => s.trim());
  let value = getPath(ctx, path);
  for (const name of filters) {
    const fn = FILTERS[name];
    if (fn) value = fn(value);
  }
  return value;
};

/** Resolve template tokens in a string. Single-token strings return raw values. */
export function resolveString(str, ctx) {
  const whole = str.match(WHOLE);
  if (whole) return evalExpr(whole[1], ctx);
  return str.replace(TOKEN, (_, expr) => {
    const v = evalExpr(expr, ctx);
    return v == null ? "" : String(v);
  });
}

/** Recursively resolve templates in strings/arrays/objects. */
export function resolveDeep(value, ctx) {
  if (typeof value === "string") return resolveString(value, ctx);
  if (Array.isArray(value)) return value.map((v) => resolveDeep(v, ctx));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveDeep(v, ctx);
    return out;
  }
  return value;
}

/** Coerce a resolved condition to a boolean (treats the string "false" as false). */
export const truthy = (value) => value !== "false" && Boolean(value);

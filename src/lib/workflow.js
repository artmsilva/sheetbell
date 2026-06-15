// A tiny workflow engine: run a declarative list of steps against a trigger.
//
// A workflow is { trigger, steps[] }. Each step is { id, type, ...config } where
// config values may contain `{{ }}` templates resolved against the run context
// (trigger fields, env, config, and prior steps' outputs under `steps.<id>`).
//
// Step control:
//   - `core: true`   — failure aborts the run (throws WorkflowCoreError).
//                      Non-core step failures are recorded and the run continues.
//   - `when: "<expr>"`   — run only if the resolved condition is truthy.
//   - `unless: "<expr>"` — run only if the resolved condition is falsy.
//
// Node types wrap the lib clients; add a new integration by adding an entry to
// NODES (e.g. email, discord) — workflows can use it immediately.

import { resolveDeep, resolveString, truthy } from "./expressions.js";
import { postMessage } from "./slack.js";
import { findContactIndex, columnLetter } from "./matching.js";

export class WorkflowCoreError extends Error {
  constructor(stepId, cause) {
    super(`Core step '${stepId}' failed: ${cause.message}`);
    this.name = "WorkflowCoreError";
    this.stepId = stepId;
    this.cause = cause;
  }
}

const META = new Set(["id", "type", "when", "unless", "core"]);

const NODES = {
  /** Append a row to a sheet tab (atomic). config: { tab, row[] } */
  "sheets.append": async (cfg, _ctx, { sheets }) => {
    await sheets.appendRow(`${cfg.tab}!A1`, cfg.row);
    return { appended: true };
  },

  /** Find a contact in a tab and set columns on its row.
   *  config: { tab, match, threshold?, set: [{ column, value }] } */
  "sheets.matchUpdate": async (cfg, _ctx, { sheets, config }) => {
    const rows = await sheets.getValues(`${cfg.tab}!A:Z`);
    if (rows.length === 0) return { matched: false };
    const index = findContactIndex(
      rows.map((r) => r[0]),
      cfg.match,
      cfg.threshold ?? config.matching.similarityThreshold
    );
    if (index === -1) return { matched: false };

    const header = rows[0];
    const rowNum = index + 1;
    for (const { column, value } of cfg.set ?? []) {
      const col = header.findIndex((h) => h === column);
      if (col !== -1) {
        await sheets.update(`${cfg.tab}!${columnLetter(col)}${rowNum}`, [[value]]);
      }
    }
    return { matched: true, row: rowNum };
  },

  /** Post a Slack message. config: { channel, blocks, threadTs? } → { ts } */
  "slack.message": async (cfg) => {
    const ts = await postMessage({
      channel: cfg.channel,
      blocks: cfg.blocks,
      threadTs: cfg.threadTs || undefined,
    });
    return { ts };
  },

  /** Make an outbound HTTP request. config: { url, method?, headers?, body? } */
  "http.request": async (cfg) => {
    const res = await fetch(cfg.url, {
      method: cfg.method || "POST",
      headers: cfg.headers || {},
      body:
        cfg.body == null
          ? undefined
          : typeof cfg.body === "string"
            ? cfg.body
            : JSON.stringify(cfg.body),
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON response */
    }
    return { status: res.status, ok: res.ok, body };
  },
};

export const nodeTypes = () => Object.keys(NODES);

/**
 * Run a workflow. Returns { steps: [{ id, status, output?, error? }] }.
 * Throws WorkflowCoreError if a step marked `core` fails.
 */
export async function runWorkflow(def, trigger, services) {
  const ctx = {
    ...trigger,
    trigger,
    env: services.env ?? {},
    config: services.config,
    now: services.now,
    steps: {},
  };
  const results = [];

  for (const step of def.steps) {
    if (step.when !== undefined && !truthy(resolveString(String(step.when), ctx))) {
      results.push({ id: step.id, status: "skipped" });
      continue;
    }
    if (step.unless !== undefined && truthy(resolveString(String(step.unless), ctx))) {
      results.push({ id: step.id, status: "skipped" });
      continue;
    }

    const node = NODES[step.type];
    if (!node) {
      const error = `Unknown node type: ${step.type}`;
      results.push({ id: step.id, status: "error", error });
      if (step.core) throw new WorkflowCoreError(step.id, new Error(error));
      continue;
    }

    const cfg = {};
    for (const [key, value] of Object.entries(step)) {
      if (!META.has(key)) cfg[key] = resolveDeep(value, ctx);
    }

    try {
      const output = await node(cfg, ctx, services);
      ctx.steps[step.id] = output;
      results.push({ id: step.id, status: "ok", output });
    } catch (error) {
      results.push({ id: step.id, status: "error", error: error.message });
      if (step.core) throw new WorkflowCoreError(step.id, error);
    }
  }

  return { steps: results };
}

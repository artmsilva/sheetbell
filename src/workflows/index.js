// Workflow registry. Add a workflow by importing it here and adding it to the
// map; its slug becomes addressable as a webhook (/api/hooks/<slug>) and, for
// form triggers, drives the form at /.

import conversation from "./conversation.js";

export const workflows = {
  [conversation.slug]: conversation,
};

export const allWorkflows = Object.values(workflows);

/** The form-triggered workflow rendered at `/` (the first one defined). */
export const primaryFormWorkflow = allWorkflows.find(
  (w) => w.trigger?.type === "form"
);

// Request-body validation for the submit endpoint. Pure function, no I/O.
//
// Returns either { valid: true, data } with sanitized values, or
// { valid: false, error } with a human-readable message.

const SCHEMA = {
  contact: { type: "string", required: true, maxLength: 100 },
  organizer: { type: "string", required: true, maxLength: 100 },
  date: {
    type: "date",
    required: true,
    validate: (v) => !Number.isNaN(new Date(v).getTime()),
  },
  message: { type: "string", required: true, maxLength: 5000 },
};

export function validateRequestBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  // Reject unexpected fields (potential injection vectors).
  const allowed = Object.keys(SCHEMA);
  const unexpected = Object.keys(body).filter((k) => !allowed.includes(k));
  if (unexpected.length > 0) {
    return { valid: false, error: `Unexpected fields: ${unexpected.join(", ")}` };
  }

  const data = {};
  const errors = [];

  for (const [field, rules] of Object.entries(SCHEMA)) {
    const value = body[field];

    if (rules.required && (value === undefined || value === null)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }
    if (!rules.required && value === undefined) continue;

    if (rules.type === "string") {
      if (typeof value !== "string") {
        errors.push(`Field '${field}' must be a string`);
        continue;
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(
          `Field '${field}' exceeds maximum length of ${rules.maxLength}`
        );
        continue;
      }
    }

    if (rules.validate && !rules.validate(value)) {
      errors.push(`Invalid value for field '${field}'`);
      continue;
    }

    data[field] = typeof value === "string" ? value.trim() : value;
  }

  if (errors.length > 0) return { valid: false, error: errors.join("; ") };
  return { valid: true, data };
}

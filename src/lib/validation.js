// Validate a request body against a workflow trigger's `fields` schema.
// Pure function, no I/O. Returns { valid: true, data } or { valid: false, error }.
//
// A field is { name, type: "text"|"textarea"|"date", required?, maxLength? }.

export function validateFields(fields, body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const allowed = fields.map((f) => f.name);
  const unexpected = Object.keys(body).filter((k) => !allowed.includes(k));
  if (unexpected.length > 0) {
    return { valid: false, error: `Unexpected fields: ${unexpected.join(", ")}` };
  }

  const data = {};
  const errors = [];

  for (const field of fields) {
    const value = body[field.name];

    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push(`Missing required field: ${field.name}`);
      continue;
    }
    if (value === undefined) continue;

    const isText = field.type === "text" || field.type === "textarea";
    if (isText && typeof value !== "string") {
      errors.push(`Field '${field.name}' must be a string`);
      continue;
    }
    if (field.maxLength && typeof value === "string" && value.length > field.maxLength) {
      errors.push(`Field '${field.name}' exceeds maximum length of ${field.maxLength}`);
      continue;
    }
    if (field.type === "date" && Number.isNaN(new Date(value).getTime())) {
      errors.push(`Invalid value for field '${field.name}'`);
      continue;
    }

    data[field.name] = typeof value === "string" ? value.trim() : value;
  }

  if (errors.length > 0) return { valid: false, error: errors.join("; ") };
  return { valid: true, data };
}

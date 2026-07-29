const ALLOWED_FIELDS = new Set(["event_type", "stay_action"]);
const SERVER_MANAGED_FIELDS = new Set([
  "stay_context_id",
  "stay_event_link_id",
  "lifecycle_status",
  "genesis_anchor_id"
]);
const GENESIS_EVENTS = new Set(["rent", "deposit_in"]);

function error(error_code, fields = []) {
  return {
    error_code,
    forbidden_fields: [...new Set(fields)].sort((a, b) => a.localeCompare(b))
  };
}

export function evaluateStayGenesisTrigger(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return error("STAY_TRIGGER_UNKNOWN_FIELD", ["input"]);
  }

  const fields = Object.keys(input);
  const serverManaged = fields.filter(field => SERVER_MANAGED_FIELDS.has(field));
  if (serverManaged.length) {
    return error("STAY_SERVER_MANAGED_FIELD_FORBIDDEN", serverManaged);
  }
  const unknown = fields.filter(field => !ALLOWED_FIELDS.has(field));
  if (unknown.length) {
    return error("STAY_TRIGGER_UNKNOWN_FIELD", unknown);
  }

  if (!Object.hasOwn(input, "stay_action")) {
    return { requested: false, genesis_event_type: null };
  }
  if (input.stay_action !== "start") {
    return error("STAY_ACTION_INVALID");
  }
  if (typeof input.event_type !== "string" || !input.event_type) {
    return error("STAY_EVENT_TYPE_REQUIRED");
  }
  if (!GENESIS_EVENTS.has(input.event_type)) {
    return error("STAY_GENESIS_EVENT_NOT_ALLOWED");
  }
  return { requested: true, genesis_event_type: input.event_type };
}

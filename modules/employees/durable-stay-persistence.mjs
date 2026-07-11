const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENESIS_FIELDS = new Set([
  "corpid",
  "genesis_event_type",
  "genesis_session_id",
  "genesis_entry_id",
  "genesis_anchor_id",
  "started_at"
]);
const GENESIS_EVENT_TYPES = new Set(["rent", "deposit_in", "legacy_bootstrap"]);
const PREPARED_GENESIS_FIELDS = new Set([
  "stay_context_id",
  "corpid",
  "genesis_event_type",
  "genesis_session_id",
  "genesis_entry_id",
  "genesis_anchor_id",
  "started_at",
  "lifecycle_status"
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function requiredText(value, code, message) {
  if (typeof value !== "string" || !value.trim()) fail(code, message);
  return value.trim();
}

function optionalText(value, code, message) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !value.trim()) fail(code, message);
  return value.trim();
}

export function createOpaqueStayContextId(randomUUID) {
  if (typeof randomUUID !== "function") {
    fail("STAY_RANDOM_UUID_REQUIRED", "A randomUUID function is required.");
  }
  let value;
  try {
    value = randomUUID();
  } catch {
    fail("STAY_ID_GENERATION_FAILED", "Opaque stay ID generation failed.");
  }
  if (typeof value !== "string" || !UUID_V4_PATTERN.test(value)) {
    fail("STAY_ID_INVALID_UUID", "Opaque stay ID generation returned an invalid UUID.");
  }
  return value;
}

export function validateStayGenesisInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("STAY_GENESIS_INPUT_REQUIRED", "Stay genesis input must be an object.");
  }
  const extraFields = Object.keys(input).filter(field => !GENESIS_FIELDS.has(field));
  if (extraFields.length) {
    fail("STAY_GENESIS_EXTRA_FIELD", "Stay genesis input contains fields outside the contract.");
  }

  const corpid = requiredText(input.corpid, "STAY_GENESIS_CORPID_REQUIRED", "Stay genesis requires corpid.");
  const genesisEventType = requiredText(input.genesis_event_type, "STAY_GENESIS_EVENT_TYPE_REQUIRED", "Stay genesis requires genesis_event_type.");
  if (!GENESIS_EVENT_TYPES.has(genesisEventType)) {
    fail("STAY_GENESIS_EVENT_TYPE_INVALID", "Stay genesis_event_type is not supported.");
  }
  const genesisAnchorId = requiredText(input.genesis_anchor_id, "STAY_GENESIS_ANCHOR_REQUIRED", "Stay genesis requires genesis_anchor_id.");
  const startedAt = requiredText(input.started_at, "STAY_GENESIS_STARTED_AT_REQUIRED", "Stay genesis requires started_at.");
  const genesisSessionId = optionalText(input.genesis_session_id, "STAY_GENESIS_SESSION_INVALID", "Stay genesis_session_id must be non-empty when provided.");
  const genesisEntryId = optionalText(input.genesis_entry_id, "STAY_GENESIS_ENTRY_INVALID", "Stay genesis_entry_id must be non-empty when provided.");

  if (genesisEventType !== "legacy_bootstrap") {
    if (!genesisSessionId) fail("STAY_GENESIS_SESSION_REQUIRED", "Rent and Deposit In genesis require genesis_session_id.");
    if (!genesisEntryId) fail("STAY_GENESIS_ENTRY_REQUIRED", "Rent and Deposit In genesis require genesis_entry_id.");
  }

  return {
    corpid,
    genesis_event_type: genesisEventType,
    genesis_session_id: genesisSessionId,
    genesis_entry_id: genesisEntryId,
    genesis_anchor_id: genesisAnchorId,
    started_at: startedAt
  };
}

export function prepareStayGenesis(input, options = {}) {
  const validated = validateStayGenesisInput(input);
  if (validated.genesis_event_type === "legacy_bootstrap") {
    fail("LEGACY_BOOTSTRAP_PERSISTENCE_NOT_IMPLEMENTED", "Legacy bootstrap persistence is not implemented.");
  }
  return {
    stay_context_id: createOpaqueStayContextId(options.randomUUID),
    ...validated,
    lifecycle_status: "active"
  };
}

function validatePreparedStayGenesis(prepared) {
  if (!prepared || typeof prepared !== "object" || Array.isArray(prepared)) {
    fail("STAY_PREPARED_GENESIS_REQUIRED", "Prepared stay genesis must be an object.");
  }
  const extraFields = Object.keys(prepared).filter(field => !PREPARED_GENESIS_FIELDS.has(field));
  if (extraFields.length) {
    fail("STAY_PREPARED_GENESIS_EXTRA_FIELD", "Prepared stay genesis contains fields outside the contract.");
  }
  if (typeof prepared.stay_context_id !== "string" || !UUID_V4_PATTERN.test(prepared.stay_context_id)) {
    fail("STAY_PREPARED_STAY_ID_INVALID", "Prepared stay_context_id must be a valid UUID v4.");
  }
  if (prepared.lifecycle_status !== "active") {
    fail("STAY_PREPARED_LIFECYCLE_INVALID", "Prepared stay genesis lifecycle_status must be active.");
  }
  const validated = validateStayGenesisInput({
    corpid: prepared.corpid,
    genesis_event_type: prepared.genesis_event_type,
    genesis_session_id: prepared.genesis_session_id,
    genesis_entry_id: prepared.genesis_entry_id,
    genesis_anchor_id: prepared.genesis_anchor_id,
    started_at: prepared.started_at
  });
  if (validated.genesis_event_type === "legacy_bootstrap") {
    fail("LEGACY_BOOTSTRAP_PERSISTENCE_NOT_IMPLEMENTED", "Legacy bootstrap persistence is not implemented.");
  }
  return {
    stay_context_id: prepared.stay_context_id,
    ...validated,
    lifecycle_status: "active"
  };
}

export async function persistPreparedStayGenesis(db, prepared, options = {}) {
  const validated = validatePreparedStayGenesis(prepared);
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    fail("STAY_GENESIS_DATABASE_REQUIRED", "A D1-compatible database is required.");
  }
  const createdAt = requiredText(options.createdAt, "STAY_GENESIS_CREATED_AT_REQUIRED", "Stay genesis persistence requires createdAt.");
  const stayEventLinkId = createOpaqueStayContextId(options.randomUUID);
  if (validated.stay_context_id === stayEventLinkId) {
    fail("STAY_GENESIS_IDS_MUST_DIFFER", "Stay context and event link IDs must differ.");
  }

  const stayStatement = db.prepare(`INSERT INTO stay_contexts (
    stay_context_id,
    corpid,
    lifecycle_status,
    genesis_event_type,
    genesis_session_id,
    genesis_entry_id,
    genesis_anchor_id,
    started_at
  ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?)`)
    .bind(
      validated.stay_context_id,
      validated.corpid,
      validated.genesis_event_type,
      validated.genesis_session_id,
      validated.genesis_entry_id,
      validated.genesis_anchor_id,
      validated.started_at
    );

  const linkStatement = db.prepare(`INSERT INTO stay_event_links (
    stay_event_link_id,
    corpid,
    stay_context_id,
    session_id,
    entry_id,
    anchor_id,
    event_type,
    link_role,
    occurred_at,
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 'genesis', ?, ?)`)
    .bind(
      stayEventLinkId,
      validated.corpid,
      validated.stay_context_id,
      validated.genesis_session_id,
      validated.genesis_entry_id,
      validated.genesis_anchor_id,
      validated.genesis_event_type,
      validated.started_at,
      createdAt
    );

  await db.batch([stayStatement, linkStatement]);
  return {
    stay_context_id: validated.stay_context_id,
    stay_event_link_id: stayEventLinkId,
    lifecycle_status: "active",
    genesis_event_type: validated.genesis_event_type,
    write_attempted: true
  };
}

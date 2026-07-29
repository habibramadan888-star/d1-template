const STATUS = new Set([
  "confirmed",
  "canonical_only_pending_registry",
  "registry_conflict",
  "missing"
]);
const INACTIVE_ARCHIVE_STATES = new Set(["void", "voided", "deleted", "reversed"]);

function text(value, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanBed(value) {
  return text(value, 80).replace(/^#/, "");
}

function warnings(values = []) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function output(status, fields = {}) {
  if (!STATUS.has(status)) throw new Error("CANONICAL_STAY_STATUS_INVALID");
  return {
    status,
    stay_context_id: fields.stay_context_id ?? null,
    lifecycle_status: fields.lifecycle_status ?? null,
    canonical_anchor_id: fields.canonical_anchor_id ?? null,
    canonical_session_id: fields.canonical_session_id ?? null,
    canonical_entry_id: fields.canonical_entry_id ?? null,
    genesis_event_type: fields.genesis_event_type ?? null,
    registry_status: fields.registry_status ?? "missing",
    warnings: warnings(fields.warnings)
  };
}

function archiveActive(row = {}) {
  const state = text(row.archive_state || row.canonical_archive_state || row.status, 40).toLowerCase();
  if (INACTIVE_ARCHIVE_STATES.has(state)) return false;
  if (row.voided_at || row.reversed_at || row.deleted_at) return false;
  return true;
}

function parseEntries(session) {
  if (!archiveActive(session)) return { entries: [], malformed: false };
  try {
    const parsed = typeof session.entries_json === "string" ? JSON.parse(session.entries_json) : session.entries_json;
    const entries = Array.isArray(parsed) ? parsed : parsed?.entries;
    return { entries: Array.isArray(entries) ? entries : [], malformed: !Array.isArray(entries) };
  } catch {
    return { entries: [], malformed: true };
  }
}

function canonicalCandidate(session, entry, corpid, bed) {
  if (!archiveActive(entry)) return null;
  const entryCorpid = text(entry.corpid || session.corpid, 120);
  if (entryCorpid !== corpid) return null;
  if (cleanBed(entry.bed || entry.room) !== bed) return null;
  const stayContextId = text(entry.stay_context_id, 160);
  if (!stayContextId) return null;
  const eventType = text(entry.event_type, 80).toLowerCase();
  const genesis = entry.stay_lifecycle_action === "genesis" || entry.stay_action === "start";
  if (!genesis || !["rent", "deposit_in"].includes(eventType)) return null;
  if (text(entry.lifecycle_status || entry.stay_lifecycle_status || "active", 40).toLowerCase() !== "active") return null;
  return {
    stay_context_id: stayContextId,
    corpid: entryCorpid,
    lifecycle_status: "active",
    canonical_anchor_id: text(entry.anchor_id || entry.event_id || entry.id, 160),
    canonical_session_id: text(entry.session_id || session.id || session.session_id, 160),
    canonical_entry_id: text(entry.entry_id || entry.id || entry.event_id, 160),
    genesis_event_type: eventType,
    started_at: text(entry.created_at || entry.started_at || session.created_at, 80)
  };
}

function contextMatches(row, candidate) {
  return !!row &&
    text(row.stay_context_id, 160) === candidate.stay_context_id &&
    text(row.corpid, 120) === candidate.corpid &&
    text(row.lifecycle_status, 40) === "active" &&
    text(row.genesis_event_type, 80) === candidate.genesis_event_type &&
    text(row.genesis_session_id, 160) === candidate.canonical_session_id &&
    text(row.genesis_entry_id, 160) === candidate.canonical_entry_id &&
    text(row.genesis_anchor_id, 160) === candidate.canonical_anchor_id &&
    text(row.started_at, 80) === candidate.started_at;
}

function linkMatches(row, candidate) {
  return !!row &&
    text(row.corpid, 120) === candidate.corpid &&
    text(row.stay_context_id, 160) === candidate.stay_context_id &&
    text(row.session_id, 160) === candidate.canonical_session_id &&
    text(row.entry_id, 160) === candidate.canonical_entry_id &&
    text(row.anchor_id, 160) === candidate.canonical_anchor_id &&
    text(row.event_type, 80) === candidate.genesis_event_type &&
    text(row.link_role, 40) === "genesis" &&
    text(row.occurred_at, 80) === candidate.started_at;
}

export function buildCanonicalStayBedContext(input = {}) {
  const corpid = text(input.corpid, 120);
  const bed = cleanBed(input.bed);
  const limit = Math.min(Math.max(Number(input.limit || 500), 1), 1000);
  const sessions = Array.isArray(input.sessions) ? input.sessions.slice(0, limit) : [];
  const contexts = Array.isArray(input.stay_contexts) ? input.stay_contexts.slice(0, limit) : [];
  const links = Array.isArray(input.stay_event_links) ? input.stay_event_links.slice(0, limit) : [];
  const found = [];
  const warningList = [];

  for (const session of sessions) {
    if (text(session?.corpid, 120) !== corpid) continue;
    const parsed = parseEntries(session);
    if (parsed.malformed) warningList.push("MALFORMED_CANONICAL_ENTRIES_JSON");
    for (const entry of parsed.entries) {
      const candidate = canonicalCandidate(session, entry, corpid, bed);
      if (candidate) found.push(candidate);
    }
  }

  const stayIds = [...new Set(found.map(candidate => candidate.stay_context_id))];
  if (stayIds.length > 1) {
    return output("registry_conflict", {
      registry_status: "conflict",
      warnings: [...warningList, "MULTIPLE_ACTIVE_STAY_CONTEXTS_FOR_BED"]
    });
  }
  if (!found.length) return output("missing", { warnings: warningList });

  const candidate = found[0];
  const matchingContexts = contexts.filter(row => text(row?.corpid, 120) === corpid && text(row?.genesis_anchor_id, 160) === candidate.canonical_anchor_id);
  const matchingLinks = links.filter(row => text(row?.corpid, 120) === corpid && text(row?.anchor_id, 160) === candidate.canonical_anchor_id);
  if (matchingContexts.length > 1 || matchingLinks.length > 1) {
    return output("registry_conflict", { registry_status: "conflict", warnings: [...warningList, "STAY_REGISTRY_CONFLICT"] });
  }
  const context = matchingContexts[0] || null;
  const link = matchingLinks[0] || null;
  if (!context || !link) {
    if ((context && !contextMatches(context, candidate)) || (link && !linkMatches(link, candidate))) {
      return output("registry_conflict", { registry_status: "conflict", warnings: [...warningList, "STAY_REGISTRY_CONFLICT"] });
    }
    return output("canonical_only_pending_registry", {
      ...candidate,
      registry_status: "pending_rebuild",
      warnings: [...warningList, "STAY_REGISTRY_REBUILD_REQUIRED"]
    });
  }
  if (!contextMatches(context, candidate) || !linkMatches(link, candidate)) {
    return output("registry_conflict", { registry_status: "conflict", warnings: [...warningList, "STAY_REGISTRY_CONFLICT"] });
  }
  return output("confirmed", { ...candidate, registry_status: "confirmed", warnings: warningList });
}

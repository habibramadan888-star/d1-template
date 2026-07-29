import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildCanonicalStayBedContext } from "../modules/employees/canonical-stay-bed-context.mjs";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const modulePath = new URL("../modules/employees/canonical-stay-bed-context.mjs", import.meta.url);
const STAY_ID = "11111111-1111-4111-8111-111111111111";

function entry(overrides = {}) {
  return {
    id: "entry-1",
    entry_id: "entry-1",
    anchor_id: "anchor-1",
    event_type: "rent",
    bed: "611",
    stay_action: "start",
    stay_context_id: STAY_ID,
    stay_lifecycle_action: "genesis",
    created_at: "2026-07-11T12:00:00+04:00",
    ...overrides
  };
}

function session(overrides = {}, entryOverrides = {}) {
  const row = entry(entryOverrides);
  return {
    id: "session-1",
    corpid: "corp-a",
    created_at: "2026-07-11T12:00:00+04:00",
    archive_state: "active",
    entries_json: JSON.stringify({ anchor_contract_version: "employee_entry_anchor_v1", entries: [row] }),
    ...overrides
  };
}

function context(overrides = {}) {
  return {
    stay_context_id: STAY_ID,
    corpid: "corp-a",
    lifecycle_status: "active",
    genesis_event_type: "rent",
    genesis_session_id: "session-1",
    genesis_entry_id: "entry-1",
    genesis_anchor_id: "anchor-1",
    started_at: "2026-07-11T12:00:00+04:00",
    ...overrides
  };
}

function link(overrides = {}) {
  return {
    stay_event_link_id: "22222222-2222-4222-a222-222222222222",
    corpid: "corp-a",
    stay_context_id: STAY_ID,
    session_id: "session-1",
    entry_id: "entry-1",
    anchor_id: "anchor-1",
    event_type: "rent",
    link_role: "genesis",
    occurred_at: "2026-07-11T12:00:00+04:00",
    ...overrides
  };
}

function build(overrides = {}) {
  return buildCanonicalStayBedContext({
    corpid: "corp-a",
    bed: "611",
    sessions: [session()],
    stay_contexts: [context()],
    stay_event_links: [link()],
    ...overrides
  });
}

test("canonical entry and exact registry return confirmed", () => {
  assert.deepEqual(build(), {
    status: "confirmed",
    stay_context_id: STAY_ID,
    lifecycle_status: "active",
    canonical_anchor_id: "anchor-1",
    canonical_session_id: "session-1",
    canonical_entry_id: "entry-1",
    genesis_event_type: "rent",
    registry_status: "confirmed",
    warnings: []
  });
});

test("canonical identity without complete registry returns pending rebuild", () => {
  for (const registry of [
    { stay_contexts: [], stay_event_links: [] },
    { stay_contexts: [context()], stay_event_links: [] }
  ]) {
    const result = build(registry);
    assert.equal(result.status, "canonical_only_pending_registry");
    assert.equal(result.stay_context_id, STAY_ID);
    assert.equal(result.registry_status, "pending_rebuild");
    assert.ok(result.warnings.includes("STAY_REGISTRY_REBUILD_REQUIRED"));
  }
});

test("registry field disagreement fails closed without selecting either ID", () => {
  const result = build({ stay_contexts: [context({ stay_context_id: "33333333-3333-4333-a333-333333333333" })] });
  assert.equal(result.status, "registry_conflict");
  assert.equal(result.stay_context_id, null);
  assert.ok(result.warnings.includes("STAY_REGISTRY_CONFLICT"));
});

test("missing canonical identity returns missing even when access context is supplied", () => {
  const result = buildCanonicalStayBedContext({
    corpid: "corp-a",
    bed: "611",
    sessions: [session({}, { stay_context_id: "" })],
    stay_contexts: [context()],
    stay_event_links: [link()],
    access_snapshot: { parsed_vacancy_marker: false, parsed_checkin_mmdd: "0711" }
  });
  assert.equal(result.status, "missing");
  assert.equal(result.stay_context_id, null);
});

test("multiple active canonical stay IDs for one bed return conflict", () => {
  const second = session({ id: "session-2" }, {
    id: "entry-2",
    entry_id: "entry-2",
    anchor_id: "anchor-2",
    stay_context_id: "33333333-3333-4333-a333-333333333333"
  });
  const result = build({ sessions: [session(), second] });
  assert.equal(result.status, "registry_conflict");
  assert.equal(result.stay_context_id, null);
  assert.ok(result.warnings.includes("MULTIPLE_ACTIVE_STAY_CONTEXTS_FOR_BED"));
});

test("voided and reversed genesis facts are ignored", () => {
  for (const archive_state of ["voided", "reversed", "deleted"]) {
    const result = build({ sessions: [session({ archive_state })] });
    assert.equal(result.status, "missing");
  }
  const entryVoided = build({ sessions: [session({}, { archive_state: "voided" })] });
  assert.equal(entryVoided.status, "missing");
});

test("corrected active canonical anchor remains eligible for confirmation", () => {
  const corrected = session({ archive_state: "corrected" }, { archive_state: "corrected" });
  assert.equal(build({ sessions: [corrected] }).status, "confirmed");
});

test("company scope isolates canonical and registry rows", () => {
  const foreignSession = session({ corpid: "corp-b" });
  assert.equal(build({ sessions: [foreignSession] }).status, "missing");
  const foreignRegistry = build({ stay_contexts: [context({ corpid: "corp-b" })], stay_event_links: [link({ corpid: "corp-b" })] });
  assert.equal(foreignRegistry.status, "canonical_only_pending_registry");
});

test("provider identity fields cannot influence or appear in output", () => {
  const contaminated = session({}, {
    tenant_card_id: "provider-tenant",
    card_id: "provider-card",
    provider_phone: "provider-phone",
    phone_99099: "provider-repeat",
    provider_metadata: { account: "provider-account" }
  });
  const result = build({ sessions: [contaminated] });
  assert.equal(result.status, "confirmed");
  assert.doesNotMatch(JSON.stringify(result), /provider-|tenant_card_id|card_id|phone_99099|provider_metadata/);
});

test("TTLock E/e and context fields never create or select stay identity", () => {
  for (const access_snapshot of [
    { parsed_vacancy_marker: true, physical_bed_status_source: "access_snapshot_E_marker" },
    { parsed_vacancy_marker: false, parsed_checkin_mmdd: "0711", parsed_deposit_amount: 200 }
  ]) {
    const result = buildCanonicalStayBedContext({ corpid: "corp-a", bed: "611", sessions: [], access_snapshot });
    assert.equal(result.status, "missing");
    assert.equal(result.stay_context_id, null);
  }
});

test("malformed entries_json fails closed with a safe warning", () => {
  const result = build({ sessions: [{ id: "bad", corpid: "corp-a", archive_state: "active", entries_json: "{bad-json" }] });
  assert.equal(result.status, "missing");
  assert.deepEqual(result.warnings, ["MALFORMED_CANONICAL_ENTRIES_JSON"]);
});

test("canonical scan is bounded and does not inspect rows beyond limit", () => {
  const fillers = Array.from({ length: 1000 }, (_, index) => ({
    id: `empty-${index}`,
    corpid: "corp-a",
    archive_state: "active",
    entries_json: JSON.stringify({ entries: [] })
  }));
  const result = build({ sessions: [...fillers, session()], limit: 5000 });
  assert.equal(result.status, "missing");
});

test("module is pure, read-only, bounded, and has one export", async () => {
  const exports = await import(modulePath);
  assert.deepEqual(Object.keys(exports), ["buildCanonicalStayBedContext"]);
  const source = await readFile(modulePath, "utf8");
  assert.doesNotMatch(source, /\bDB\b|\.prepare\s*\(|\.run\s*\(|\.batch\s*\(|\bINSERT\s+INTO\b|\bUPDATE\s+\w+\s+SET\b|\bDELETE\s+FROM\b|\bCREATE\s+TABLE\b|\bALTER\s+TABLE\b/i);
  assert.doesNotMatch(source, /tenant_card_id|card_id|old_ttlock_ref|provider_phone|phone_99099|provider_metadata/i);
  assert.match(source, /Math\.min\(Math\.max\(Number\(input\.limit \|\| 500\), 1\), 1000\)/);
});

test("Worker Bed Context exposes stay_context without changing Access Snapshot and occupancy fields", async () => {
  const source = await readFile(workerPath, "utf8");
  const start = source.indexOf("async function canonicalBedContextGateway");
  const end = source.indexOf('__name(canonicalBedContextGateway,"canonicalBedContextGateway")', start);
  const gateway = source.slice(start, end);
  const stayStart = source.indexOf("async function canonicalStayBedContextGateway");
  const stayEnd = source.indexOf('__name(canonicalStayBedContextGateway,"canonicalStayBedContextGateway")', stayStart);
  const stayGateway = source.slice(stayStart, stayEnd);
  assert.match(gateway, /stay_context:stayContext/);
  assert.match(gateway, /access_snapshot_context/);
  assert.match(gateway, /occupancy_status/);
  assert.match(gateway, /deposit_status/);
  assert.match(stayGateway, /cloudArrearsFetchActiveSessionRows/);
  assert.match(stayGateway, /buildCanonicalStayBedContext/);
  assert.doesNotMatch(stayGateway, /\.run\s*\(|\.batch\s*\(|INSERT|UPDATE|DELETE|CREATE|ALTER/i);
});

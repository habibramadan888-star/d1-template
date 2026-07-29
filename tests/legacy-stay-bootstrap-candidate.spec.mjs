import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildLegacyStayBootstrapCandidate } from "../modules/employees/legacy-stay-bootstrap-candidate.mjs";

const modulePath = new URL("../modules/employees/legacy-stay-bootstrap-candidate.mjs", import.meta.url);

function source(overrides = {}) {
  return {
    corpid: "corp-a",
    bed: "611",
    event_type: "rent",
    source_session_id: "session-legacy-1",
    source_entry_id: "entry-legacy-1",
    source_anchor_id: "anchor-legacy-1",
    archive_state: "active",
    ...overrides
  };
}

function input(overrides = {}) {
  return {
    corpid: "corp-a",
    company_scope: { corpid: "corp-a" },
    bed: "611",
    bed_context: { stay_context: { status: "missing", stay_context_id: null } },
    canonical_sources: [source()],
    access_snapshot: {
      corpid: "corp-a",
      parsed_vacancy_marker: false,
      physical_bed_status_source: "access_snapshot_no_E",
      parsed_checkin_mmdd: "0711",
      normalized_expiry_value: "2026-08-11T12:00:00+04:00",
      parsed_deposit_amount: 200
    },
    ...overrides
  };
}

test("occupied legacy bed with complete canonical and Access Snapshot facts is eligible for owner review", () => {
  assert.deepEqual(buildLegacyStayBootstrapCandidate(input()), {
    eligibility: "eligible_for_owner_review",
    genesis_event_type: "legacy_bootstrap",
    corpid: "corp-a",
    bed: "611",
    source_session_id: "session-legacy-1",
    source_entry_id: "entry-legacy-1",
    source_anchor_id: "anchor-legacy-1",
    move_in_mmdd: "0711",
    expiry_value: "2026-08-11T12:00:00+04:00",
    deposit_d_amount: 200,
    blockers: [],
    warnings: []
  });
});

test("confirmed or canonical-only stay identity is not a bootstrap candidate", () => {
  for (const status of ["confirmed", "canonical_only_pending_registry"]) {
    const result = buildLegacyStayBootstrapCandidate(input({
      bed_context: { stay_context: { status, stay_context_id: "existing-stay" } },
      canonical_sources: [],
      access_snapshot: {}
    }));
    assert.equal(result.eligibility, "already_has_stay_context");
    assert.deepEqual(result.blockers, []);
  }
});

test("independent TTLock E/e vacancy marker blocks preview", () => {
  const result = buildLegacyStayBootstrapCandidate(input({
    access_snapshot: { ...input().access_snapshot, parsed_vacancy_marker: true, physical_bed_status_source: "access_snapshot_E_marker" }
  }));
  assert.equal(result.eligibility, "blocked");
  assert.ok(result.blockers.includes("TTLOCK_E_VACANT"));
});

test("missing and invalid MMDD block without inferring a date", () => {
  for (const parsed_checkin_mmdd of ["", "0000", "0230", "1301", "711"]) {
    const result = buildLegacyStayBootstrapCandidate(input({ access_snapshot: { ...input().access_snapshot, parsed_checkin_mmdd } }));
    assert.equal(result.eligibility, "blocked");
    assert.equal(result.move_in_mmdd, null);
    assert.ok(result.blockers.some(code => code.startsWith("MOVE_IN_MMDD_")));
  }
});

test("missing or invalid full expiry blocks preview", () => {
  for (const normalized_expiry_value of ["", "unknown", "2026-02-30", "0811"]) {
    const result = buildLegacyStayBootstrapCandidate(input({ access_snapshot: { ...input().access_snapshot, normalized_expiry_value } }));
    assert.equal(result.eligibility, "blocked");
    assert.equal(result.expiry_value, null);
    assert.ok(result.blockers.some(code => code.startsWith("EXPIRY_VALUE_")));
  }
});

test("missing canonical source anchor blocks preview", () => {
  const result = buildLegacyStayBootstrapCandidate(input({ canonical_sources: [] }));
  assert.equal(result.eligibility, "blocked");
  assert.ok(result.blockers.includes("CANONICAL_SOURCE_ANCHOR_MISSING"));
});

test("company and source corpid mismatches block preview", () => {
  const companyMismatch = buildLegacyStayBootstrapCandidate(input({ company_scope: { corpid: "corp-b" } }));
  assert.ok(companyMismatch.blockers.includes("CORPID_MISMATCH"));
  const sourceMismatch = buildLegacyStayBootstrapCandidate(input({ canonical_sources: [source({ corpid: "corp-b" })] }));
  assert.ok(sourceMismatch.blockers.includes("CORPID_MISMATCH"));
});

test("multiple conflicting canonical candidate anchors block preview", () => {
  const result = buildLegacyStayBootstrapCandidate(input({
    canonical_sources: [source(), source({ source_session_id: "session-2", source_entry_id: "entry-2", source_anchor_id: "anchor-2" })]
  }));
  assert.equal(result.eligibility, "blocked");
  assert.ok(result.blockers.includes("MULTIPLE_CANONICAL_SOURCE_ANCHORS"));
});

test("registry conflict in Bed Context blocks preview", () => {
  const result = buildLegacyStayBootstrapCandidate(input({ bed_context: { stay_context: { status: "registry_conflict", stay_context_id: null } } }));
  assert.equal(result.eligibility, "blocked");
  assert.ok(result.blockers.includes("STAY_CONTEXT_REGISTRY_CONFLICT"));
});

test("missing D amount is warning-only and never becomes zero", () => {
  const snapshot = { ...input().access_snapshot };
  delete snapshot.parsed_deposit_amount;
  const result = buildLegacyStayBootstrapCandidate(input({ access_snapshot: snapshot }));
  assert.equal(result.eligibility, "eligible_for_owner_review");
  assert.equal(result.deposit_d_amount, null);
  assert.deepEqual(result.warnings, ["DEPOSIT_D_MISSING"]);
});

test("provider identity inputs cannot influence or appear in candidate output", () => {
  const contaminated = input({
    tenant_card_id: "provider-tenant",
    card_id: "provider-card",
    old_ttlock_ref: "provider-old-ref",
    provider_phone: "provider-phone",
    phone_99099: "provider-repeat",
    creator_phone: "provider-creator",
    provider_metadata: { account: "provider-account" }
  });
  const result = buildLegacyStayBootstrapCandidate(contaminated);
  assert.equal(result.eligibility, "eligible_for_owner_review");
  assert.doesNotMatch(JSON.stringify(result), /provider-|tenant_card_id|card_id|old_ttlock_ref|phone_99099|creator_phone|provider_metadata/);

  const providerOnly = buildLegacyStayBootstrapCandidate({ ...contaminated, canonical_sources: [] });
  assert.equal(providerOnly.eligibility, "blocked");
  assert.ok(providerOnly.blockers.includes("CANONICAL_SOURCE_ANCHOR_MISSING"));
});

test("reserved bed is hard blocked", () => {
  const result = buildLegacyStayBootstrapCandidate(input({ bed: "334", canonical_sources: [source({ bed: "334" })] }));
  assert.equal(result.eligibility, "blocked");
  assert.ok(result.blockers.includes("BED_334_FORBIDDEN"));
});

test("voided source is unavailable and Deposit In is an allowed canonical source", () => {
  const voided = buildLegacyStayBootstrapCandidate(input({ canonical_sources: [source({ archive_state: "voided" })] }));
  assert.ok(voided.blockers.includes("CANONICAL_SOURCE_ANCHOR_MISSING"));
  const deposit = buildLegacyStayBootstrapCandidate(input({ canonical_sources: [source({ event_type: "deposit_in" })] }));
  assert.equal(deposit.eligibility, "eligible_for_owner_review");
});

test("module is pure, has one export, and cannot generate IDs or access DB/network", async () => {
  const exports = await import(modulePath);
  assert.deepEqual(Object.keys(exports), ["buildLegacyStayBootstrapCandidate"]);
  const sourceText = await readFile(modulePath, "utf8");
  assert.doesNotMatch(sourceText, /randomUUID|crypto|Math\.random|Date\.now|new Date/);
  assert.doesNotMatch(sourceText, /\bDB\b|\.prepare\s*\(|\.run\s*\(|\.batch\s*\(|fetch\s*\(|\/api\//i);
  assert.doesNotMatch(sourceText, /tenant_card_id|card_id|old_ttlock_ref|provider_phone|phone_99099|creator_phone|provider_metadata/i);
});

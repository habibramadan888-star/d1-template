import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const contractPath = "docs/INFORMATION_ANCHOR_CONTRACT_V1.md";

async function readContract() {
  return readFile(contractPath, "utf8");
}

function assertIncludes(text, values) {
  for (const value of values) {
    assert.ok(text.includes(value), `Expected contract to include: ${value}`);
  }
}

test("information anchor contract document exists", async () => {
  const contract = await readContract();
  assert.ok(contract.length > 1000);
  assert.match(contract, /^# Homelink Information Anchor Contract V1/m);
});

test("contract defines Source Authority Matrix and provider metadata deprecation", async () => {
  const contract = await readContract();
  assertIncludes(contract, [
    "## 3. Source Authority Matrix",
    "| Business Field | Authoritative Source | Context Source | Forbidden Source |",
    "card_id",
    "tenant_card_id",
    "repeated owner/admin phone ending 99099",
    "Provider phone, including repeated phone values ending 99099, is not customer phone.",
    "raw audit metadata only"
  ]);
});

test("contract defines Access Card Remark Snapshot DTO", async () => {
  const contract = await readContract();
  assertIncludes(contract, [
    "## 4. Access Card Remark Snapshot DTO",
    "access_snapshot_id",
    "property_id",
    "raw_remark",
    "parsed_deposit_amount",
    "parsed_checkin_mmdd",
    "parsed_valid_until_mmdd / expiry_mmdd if available",
    "source = access_card_remark",
    "non_authoritative_card_id optional",
    "non_authoritative_provider_phone optional",
    "Access remark snapshot is not deposit ledger authority."
  ]);
});

test("contract defines occupancy_session_id and canonical event common fields", async () => {
  const contract = await readContract();
  assertIncludes(contract, [
    "## 5. Occupancy Session Contract",
    "occupancy_session_id means a stable business lifecycle",
    "Bed is a location.",
    "card_id is not identity.",
    "provider phone is not identity.",
    "## 6. Canonical Event Common Fields",
    "event_id",
    "upload_batch_id",
    "business_date / event_time",
    "access_snapshot_before",
    "source_fingerprint",
    "canonical_fingerprint",
    "server_validated_at"
  ]);
});

test("contract defines Time Model", async () => {
  const contract = await readContract();
  assertIncludes(contract, [
    "## 7. Time Model",
    "business_date / event_time",
    "created_at",
    "synced_at",
    "effective_from",
    "effective_until",
    "rent_period_start",
    "rent_period_end",
    "access_valid_until",
    "These timestamps must not be collapsed into one timestamp."
  ]);
});

test("contract defines Duplicate / Idempotency Rules", async () => {
  const contract = await readContract();
  assertIncludes(contract, [
    "## 8. Duplicate / Idempotency Rules",
    "Synced records must not enter frontend upload payload.",
    "Backend must reject or idempotently return an existing record if event_id already exists.",
    "Backend must reject or idempotently return an existing record if source_fingerprint already exists.",
    "Backend must reject or idempotently return an existing record if canonical_fingerprint already exists.",
    "Backend cannot rely only on frontend guard.",
    "dedupe_status"
  ]);
});

test("contract defines Correction / Void / Reversal", async () => {
  const contract = await readContract();
  assertIncludes(contract, [
    "## 9. Immutable Event + Correction / Void / Reversal",
    "Original canonical events are immutable.",
    "void_event",
    "correction_event",
    "reversal_event",
    "owner_correction_event",
    "authorized_by",
    "link to original_event_id"
  ]);
});

test("contract defines State Projections and Anomaly Screening", async () => {
  const contract = await readContract();
  assertIncludes(contract, [
    "## 10. State Projections",
    "current_bed_state",
    "current_occupancy_state",
    "deposit_balance_state",
    "arrears_state",
    "access_validity_state",
    "cash_bank_balance_state",
    "network_access_state",
    "## 11. Anomaly Screening",
    "risk_code",
    "risk_level",
    "confidence_score",
    "suggested_action",
    "same bed has two active occupancy sessions",
    "card_id used as customer identity",
    "access-card phone used as tenant phone"
  ]);
});

test("contract defines all employee event anchor contracts", async () => {
  const contract = await readContract();
  assertIncludes(contract, [
    "### A. Rent",
    "### B. Arrears Payment",
    "### C. Deposit In",
    "### D. Deposit Out",
    "### E. Checkout Normal",
    "### F. Left With Arrears",
    "### G. Expense",
    "### H. Bed Transfer"
  ]);
});

test("contract locks critical event rules", async () => {
  const contract = await readContract();
  assertIncludes(contract, [
    "Bed Transfer is occupancy_session migration, not just from_bed -> to_bed.",
    "Open arrears block normal refund.",
    "Refund cannot exceed deposit balance without explicit owner approval.",
    "Offset to arrears must create explicit offset anchor.",
    "Arrears Payment must select exact arrears_ref, not repay by bed only."
  ]);
});

test("contract defines ledger and WhatsApp compiler positioning", async () => {
  const contract = await readContract();
  assertIncludes(contract, [
    "## 13. Ledger / Compiler Positioning",
    "structured transactions rows = machine truth",
    "HOMELINK LEDGER = full audit snapshot",
    "WhatsApp readable view = runtime presentation compiler output",
    "WhatsApp readable output is not source of truth.",
    "The compiler must be a presentation layer over canonical events."
  ]);
});


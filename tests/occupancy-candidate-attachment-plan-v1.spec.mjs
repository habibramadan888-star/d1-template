import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/OCCUPANCY_CANDIDATE_ATTACHMENT_PLAN_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("occupancy candidate plan exists and defines transitional candidate identity", async () => {
  const text = await doc();
  assert.match(text, /occupancy_candidate_id/);
  assert.match(text, /transitional/i);
  assert.match(text, /not the final durable `occupancy_session_id`/i);
});

test("plan keeps Step 2E planning-only with no runtime behavior", async () => {
  const text = await doc();
  assert.match(text, /planning only/i);
  assert.match(text, /No runtime implementation/i);
  assert.match(text, /No migration/i);
  assert.match(text, /No production data changes/i);
  assert.match(text, /No deploy/i);
  assert.match(text, /Runtime behavior changed in this step: no/i);
});

test("plan forbids provider metadata and legacy card identifiers for candidates", async () => {
  const text = await doc();
  for (const forbidden of [
    "card_id",
    "tenant_card_id",
    "hardware card id",
    "provider phone",
    "card metadata phone",
    "99099",
    "access-card provider phone",
    "any provider metadata phone"
  ]) {
    assert.match(text, new RegExp(escaped(forbidden), "i"));
  }
  assert.match(text, /If a candidate cannot be generated without forbidden inputs/);
});

test("plan states legacy tenant_card_id replacement is not part of this step", async () => {
  const text = await doc();
  assert.match(text, /replace `tenant_card_id` matching/);
  assert.match(text, /Current legacy `tenant_card_id` paths remain/i);
  assert.match(text, /Replace `tenant_card_id` legacy matching after durable identity exists/i);
});

test("plan defines event-by-event attachment rules", async () => {
  const text = await doc();
  for (const heading of [
    "### A. Rent",
    "### B. Arrears Payment",
    "### C. Deposit In",
    "### D. Deposit Out",
    "### E. Checkout Normal",
    "### F. Left With Arrears",
    "### G. Expense",
    "### H. Bed Transfer"
  ]) {
    assert.match(text, new RegExp(escaped(heading)));
  }
});

test("rent and arrears payment candidate rules preserve financial continuity", async () => {
  const text = await doc();
  assert.match(text, /Short-paid rent creates arrears linked to the same candidate/i);
  assert.match(text, /Must inherit candidate from selected `arrears_ref` \/ `original_event_id`/i);
  assert.match(text, /Must not derive candidate by bed only/i);
  assert.match(text, /Do not create new candidate just because payment happened/i);
});

test("deposit and checkout candidate rules are explicit", async () => {
  const text = await doc();
  assert.match(text, /`deposit_reason = new` may create a new candidate/i);
  assert.match(text, /Deposit belongs to candidate/i);
  assert.match(text, /Must link to current candidate for bed/i);
  assert.match(text, /No candidate found = anomaly \/ unresolved/i);
  assert.match(text, /Must close candidate later/i);
  assert.match(text, /If open arrears exists, normal checkout is blocked/i);
});

test("left with arrears candidate remains financially open", async () => {
  const text = await doc();
  assert.match(text, /Candidate remains financially open/i);
  assert.match(text, /Bed may become vacant for a new candidate/i);
  assert.match(text, /Arrears remains linked to old candidate/i);
  assert.match(text, /`candidate_left_with_arrears`/);
});

test("expense candidate is optional and does not force a customer stay", async () => {
  const text = await doc();
  assert.match(text, /Bed-related expense may attach to candidate/i);
  assert.match(text, /Property\/company expense should not force candidate/i);
  assert.match(text, /If general expense, `occupancy_candidate_id = null`/i);
});

test("bed transfer moves the same candidate instead of creating a new one", async () => {
  const text = await doc();
  assert.match(text, /Must move the same candidate from `from_bed` to `to_bed`/i);
  assert.match(text, /Must not create a new candidate/i);
  assert.match(text, /Must preserve deposit continuity/i);
  assert.match(text, /Must preserve arrears continuity/i);
  assert.match(text, /Must preserve rent coverage continuity/i);
  assert.match(text, /Must check `to_bed` occupancy conflict/i);
  assert.match(text, /`candidate_transferred`/);
});

test("plan defines candidate statuses and anomaly rules", async () => {
  const text = await doc();
  for (const status of [
    "candidate_active",
    "candidate_unresolved",
    "candidate_created",
    "candidate_continued",
    "candidate_transferred",
    "candidate_left_with_arrears",
    "candidate_checkout_pending",
    "candidate_closed",
    "candidate_conflict"
  ]) {
    assert.match(text, new RegExp(escaped(status)));
  }
  for (const anomaly of [
    "SAME_BED_NEW_CUSTOMER_WITH_ACTIVE_CANDIDATE",
    "ARREARS_PAYMENT_WITHOUT_ORIGINAL_CANDIDATE",
    "DEPOSIT_OUT_WITHOUT_ACTIVE_CANDIDATE",
    "CHECKOUT_WITHOUT_ACTIVE_CANDIDATE",
    "BED_TRANSFER_WITHOUT_FROM_CANDIDATE",
    "BED_TRANSFER_TO_OCCUPIED_BED",
    "PROVIDER_METADATA_USED_FOR_CANDIDATE",
    "CARD_ID_USED_FOR_CANDIDATE",
    "99099_USED_FOR_CANDIDATE"
  ]) {
    assert.match(text, new RegExp(escaped(anomaly)));
  }
});

test("plan defines phased runtime integration and no-go conditions", async () => {
  const text = await doc();
  for (const phase of ["Phase E1", "Phase E2", "Phase E3", "Phase E4", "Phase E5", "Phase E6"]) {
    assert.match(text, new RegExp(escaped(phase)));
  }
  assert.match(text, /Return candidate preview in validation response/i);
  assert.match(text, /No write/i);
  assert.match(text, /Implementation must stop if/i);
  assert.match(text, /candidate generation requires provider phone/i);
  assert.match(text, /bed transfer target occupancy is ambiguous/i);
});

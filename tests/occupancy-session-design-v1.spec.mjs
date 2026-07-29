import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/OCCUPANCY_SESSION_DESIGN_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

test("OCCUPANCY_SESSION_DESIGN_V1.md exists and defines occupancy_session_id", async () => {
  const text = await doc();
  assert.match(text, /occupancy_session_id/);
  assert.match(text, /one continuous customer or tenant stay relationship/i);
});

test("design states bed is location and occupancy session is business relationship", async () => {
  const text = await doc();
  assert.match(text, /Bed = location/);
  assert.match(text, /occupancy_session_id = business relationship/);
});

test("design forbids provider metadata as occupancy identity", async () => {
  const text = await doc();
  for (const forbidden of ["card_id", "tenant_card_id", "provider phone", "99099", "access-card metadata phone"]) {
    assert.match(text, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.match(text, /Forbidden as occupancy identity/);
});

test("design defines occupancy creation rules", async () => {
  const text = await doc();
  assert.match(text, /Deposit In new customer/);
  assert.match(text, /Rent new customer with no active occupancy/);
  assert.match(text, /Left-with-arrears former customer record/);
  assert.match(text, /Owner correction \/ historical import later/);
});

test("design defines continuation rules", async () => {
  const text = await doc();
  assert.match(text, /same bed \+ same active occupancy = continue/i);
  assert.match(text, /same bed after checkout = new occupancy/i);
  assert.match(text, /bed transfer = same occupancy moves/i);
});

test("design defines bed transfer as occupancy migration", async () => {
  const text = await doc();
  assert.match(text, /Bed transfer is occupancy session migration/i);
  for (const field of ["from_bed", "to_bed", "from_access_snapshot_before", "deposit_moved", "rent_coverage_moved", "arrears_moved", "access_validity_moved", "conflict_check"]) {
    assert.match(text, new RegExp(field));
  }
});

test("design defines checkout normal and left_with_arrears models", async () => {
  const text = await doc();
  assert.match(text, /Normal checkout/);
  assert.match(text, /closes occupancy if no open arrears/i);
  assert.match(text, /Left with arrears/);
  assert.match(text, /occupancy remains financially open/i);
});

test("design defines deposit continuity", async () => {
  const text = await doc();
  assert.match(text, /Deposit belongs to `occupancy_session_id`/);
  assert.match(text, /Access remark `D200` is context only/);
  assert.match(text, /Deposit ledger is authoritative/);
});

test("design defines arrears continuity", async () => {
  const text = await doc();
  assert.match(text, /Arrears belongs to `occupancy_session_id` plus `arrears_ref`/);
  assert.match(text, /repayment cannot be by bed only/i);
});

test("design defines future access and network relationship", async () => {
  const text = await doc();
  assert.match(text, /Network permission should attach to `occupancy_session_id`/);
  assert.match(text, /Provider card id is only a provider lookup handle/);
});

test("design defines time model", async () => {
  const text = await doc();
  for (const field of ["occupancy_started_at", "checkin_mmdd", "business_start_date", "active_from", "active_until", "rent_coverage_start", "rent_coverage_end", "checkout_date", "left_date", "closed_at", "created_at", "synced_at"]) {
    assert.match(text, new RegExp(field));
  }
});

test("design defines anomaly rules", async () => {
  const text = await doc();
  for (const code of [
    "OCCUPANCY_DOUBLE_ACTIVE_BED",
    "BED_DOUBLE_OCCUPIED",
    "TRANSFER_TO_OCCUPIED_BED",
    "ARREARS_WITHOUT_OCCUPANCY",
    "DEPOSIT_WITHOUT_OCCUPANCY",
    "CHECKOUT_WITH_OPEN_ARREARS",
    "PROVIDER_PHONE_USED_AS_CUSTOMER_PHONE",
    "CARD_ID_USED_AS_OCCUPANCY_ID",
    "BED_REUSED_WITHOUT_CHECKOUT",
    "SAME_BED_NEW_CUSTOMER_WITH_OPEN_OLD_OCCUPANCY"
  ]) {
    assert.match(text, new RegExp(code));
  }
  for (const field of ["risk_code", "risk_level", "confidence_score", "source_event_ids", "suggested_action"]) {
    assert.match(text, new RegExp(field));
  }
});

test("design defines staged migration strategy", async () => {
  const text = await doc();
  for (const phase of ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6"]) {
    assert.match(text, new RegExp(phase));
  }
  assert.match(text, /Do not implement migration now/);
});

test("design defines event mapping table", async () => {
  const text = await doc();
  assert.match(text, /\| Event Type \| Creates Occupancy \| Continues Occupancy \| Closes Occupancy \| Moves Occupancy \| Required Link \|/);
  for (const eventType of ["Rent", "Arrears Payment", "Deposit In", "Deposit Out", "Checkout Normal", "Left With Arrears", "Expense", "Bed Transfer", "Owner Correction later"]) {
    assert.match(text, new RegExp(`\\| ${eventType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|`));
  }
});

test("design remains implementation-free", async () => {
  const text = await doc();
  assert.match(text, /design only/i);
  assert.match(text, /No runtime implementation/i);
  assert.match(text, /No migration/i);
  assert.match(text, /No production data changes/i);
});


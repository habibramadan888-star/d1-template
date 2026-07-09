import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = new URL("../docs/EMPLOYEE_7_EVENT_BUSINESS_DEPENDENCY_AND_ANCHOR_MODEL_V1.md", import.meta.url);

async function readDoc() {
  return readFile(DOC, "utf8");
}

function escaped(pattern) {
  return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

test("business dependency anchor model document exists and is planning-only", async () => {
  const text = await readDoc();
  assert.match(text, /Employee 7 Event Business Dependency And Anchor Model V1/);
  for (const phrase of [
    "No runtime code changed",
    "No production data changed",
    "No deploy",
    "No migration",
    "No fake production records",
    "Production cutover = PRODUCTION_NO_GO"
  ]) {
    assert.match(text, escaped(phrase));
  }
});

test("all seven employee events are covered", async () => {
  const text = await readDoc();
  for (const heading of [
    "### 1. Rent",
    "### 2. Arrears Payment",
    "### 3. Deposit In",
    "### 4. Deposit Out",
    "### 5. Checkout",
    "### 6. Expense",
    "### 7. Bed Transfer"
  ]) {
    assert.match(text, escaped(heading));
  }
});

test("business objects are defined", async () => {
  const text = await readDoc();
  for (const objectName of [
    "occupancy_session",
    "bed",
    "rent_coverage",
    "arrears_task",
    "deposit_balance",
    "access_snapshot",
    "financial_ledger_event",
    "correction_anchor"
  ]) {
    assert.match(text, escaped(`### ${objectName}`));
    assert.match(text, /Meaning:/);
  }
});

test("dependency graph and state projection matrix are defined", async () => {
  const text = await readDoc();
  assert.match(text, /## Dependency Graph/);
  assert.match(text, /flowchart TD/);
  for (const dependency of [
    "Rent -> Arrears Task -> Arrears Payment",
    "Deposit In -> Deposit Balance -> Deposit Out",
    "Rent + Arrears + Deposit -> Checkout",
    "Checkout + unpaid arrears -> Left With Arrears",
    "Bed Transfer -> migrate occupancy state",
    "Expense -> owner finance only",
    "Correction Anchor -> adjusts projections without mutating originals"
  ]) {
    assert.match(text, escaped(dependency));
  }

  assert.match(text, /## State Projection Matrix/);
  for (const column of [
    "owner finance",
    "cash/bank total",
    "rent income",
    "deposit liability",
    "arrears state",
    "rent coverage",
    "occupancy state",
    "bed availability",
    "access/network future state",
    "owner history",
    "correction readiness"
  ]) {
    assert.match(text, escaped(column));
  }
});

test("information anchor matrix and common fields are defined", async () => {
  const text = await readDoc();
  assert.match(text, /## Information Anchor Matrix/);
  for (const field of [
    "event_id",
    "event_type",
    "occupancy_candidate_id if available",
    "amount",
    "payment_method",
    "source_fingerprint",
    "canonical_fingerprint",
    "original_event_id if applicable",
    "arrears_ref",
    "deposit_ref",
    "rent_period_start",
    "rent_period_end",
    "checkout_date",
    "from_bed",
    "to_bed",
    "correction metadata"
  ]) {
    assert.match(text, escaped(field));
  }
});

test("forbidden identity rules are defined", async () => {
  const text = await readDoc();
  assert.match(text, /## Forbidden Identity Rules/);
  for (const forbidden of [
    "card_id",
    "tenant_card_id",
    "old_ttlock_ref",
    "provider phone",
    "99099 phone",
    "card owner account phone"
  ]) {
    assert.match(text, escaped(forbidden));
  }
  for (const allowed of [
    "event_id",
    "original_event_id",
    "arrears_ref",
    "deposit_ref",
    "occupancy_session_id future",
    "occupancy_candidate_id transitional",
    "bed as context only",
    "access remark as context only"
  ]) {
    assert.match(text, escaped(allowed));
  }
});

test("each event defines required business model subsections", async () => {
  const text = await readDoc();
  const events = [
    "Rent",
    "Arrears Payment",
    "Deposit In",
    "Deposit Out",
    "Checkout",
    "Expense",
    "Bed Transfer"
  ];
  const requiredLabels = [
    "Business meaning:",
    "Preconditions:",
    "Required employee input fields:",
    "Optional fields:",
    "Forbidden identity fields:",
    "Created anchor fields:",
    "Financial effect:",
    "Projection effect:",
    "Downstream dependencies:",
    "Invalid/rejected cases:",
    "Duplicate guard rules:",
    "Correction/void/reversal requirements:",
    "Owner History representation:",
    "WhatsApp/compiler future representation:",
    "Access/network/door-card implications",
    "Final target:"
  ];

  for (const eventName of events) {
    const index = text.indexOf(`### ${events.indexOf(eventName) + 1}. ${eventName}`);
    assert.notEqual(index, -1, `${eventName} section missing`);
    const section = text.slice(index, text.indexOf("\n### ", index + 5) === -1 ? text.length : text.indexOf("\n### ", index + 5));
    for (const label of requiredLabels) {
      assert.match(section, escaped(label), `${eventName} missing ${label}`);
    }
  }
});

test("event-specific logic requirements are present", async () => {
  const text = await readDoc();
  for (const phrase of [
    "normal full rent",
    "short_paid",
    "rent_period_start",
    "rent_period_end",
    "expected_rent",
    "paid_amount",
    "arrears_ref exists",
    "full or partial",
    "Overpayment",
    "Deposit liability",
    "Cannot be treated as rent income",
    "difference_reason",
    "refund more than deposit_balance without owner override",
    "left_with_arrears",
    "bed availability",
    "cash/bank outflow",
    "not rent income",
    "same occupancy_session",
    "carry deposit_balance",
    "carry open arrears",
    "must not create duplicate deposit or duplicate rent"
  ]) {
    assert.match(text, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("correction requirements, final system target, and no-go conditions are defined", async () => {
  const text = await readDoc();
  assert.match(text, /## Correction \/ Void \/ Reversal Requirements/);
  for (const phrase of [
    "Original anchors are immutable",
    "Corrections are additive correction_anchor records",
    "Voids and reversals must reference original_event_id",
    "Financial deltas must be explicit",
    "No hard delete",
    "No silent overwrite"
  ]) {
    assert.match(text, escaped(phrase));
  }

  assert.match(text, /## Final System Target/);
  for (const phrase of [
    "Employee enters operational facts",
    "Backend creates immutable anchors",
    "Owner History shows raw events",
    "State projections calculate",
    "Correction anchors fix mistakes without deleting originals",
    "WhatsApp/compiler output is generated from structured anchors"
  ]) {
    assert.match(text, escaped(phrase));
  }

  assert.match(text, /## No-Go Conditions/);
  for (const phrase of [
    "Event preconditions are unclear",
    "Required anchors are unclear",
    "Downstream projections are unclear",
    "Forbidden identity boundaries are unclear",
    "Correction path is unclear",
    "Event can mutate original facts silently",
    "Event can affect deposit, arrears, or rent without explicit anchor",
    "Event can be linked only by bed"
  ]) {
    assert.match(text, escaped(phrase));
  }
});

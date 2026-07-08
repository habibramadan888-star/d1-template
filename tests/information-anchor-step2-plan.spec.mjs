import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const planPath = "docs/INFORMATION_ANCHOR_STEP2_IMPLEMENTATION_PLAN.md";

async function readPlan() {
  return readFile(planPath, "utf8");
}

function assertIncludes(text, values) {
  for (const value of values) {
    assert.ok(text.includes(value), `Expected Step 2 plan to include: ${value}`);
  }
}

test("Step 2 implementation plan document exists and is planning-only", async () => {
  const plan = await readPlan();
  assert.match(plan, /^# Information Anchor Contract V1 - Step 2 Implementation Plan/m);
  assertIncludes(plan, [
    "planning only",
    "No runtime implementation, API behavior, UI behavior, schema, migration, production data, or deployment is included in this step."
  ]);
});

test("Step 2 plan maps current runtime gaps", async () => {
  const plan = await readPlan();
  assertIncludes(plan, [
    "## 1. Current Runtime Gap Map",
    "| Contract Area | Current Runtime Status | Files / Functions | Gap | Risk | Migration Needed | Suggested Phase |",
    "Access Card Remark Snapshot",
    "card_id / tenant_card_id usage",
    "99099 provider phone usage",
    "occupancy_session_id",
    "Source Authority Matrix enforcement",
    "Duplicate / Idempotency Guard",
    "Ledger / Full Audit Snapshot",
    "WhatsApp Compiler later"
  ]);
});

test("Step 2 plan classifies P0/P1/P2 priorities", async () => {
  const plan = await readPlan();
  assertIncludes(plan, [
    "## 2. P0 / P1 / P2 Priority Plan",
    "### P0",
    "### P1",
    "### P2",
    "Do not put WhatsApp Compiler before the core anchors",
    "Do not put UI polish before duplicate prevention and anchor correctness."
  ]);
});

test("Step 2 plan defines ordered implementation phases", async () => {
  const plan = await readPlan();
  assertIncludes(plan, [
    "## 3. Recommended Implementation Sequence",
    "Phase 2A: Duplicate / Idempotency Guard",
    "Phase 2B: Non-authoritative field deprecation boundary",
    "Phase 2C: Access Card Remark Snapshot DTO",
    "Phase 2D: Canonical Event Common Fields for 7 events",
    "Phase 2E: occupancy_session_id design",
    "Phase 2F: Deposit / Arrears / Checkout / Bed Transfer projection alignment",
    "Phase 2G: Owner Correction / Void / Reversal event",
    "Phase 2H: Anomaly Screening",
    "Phase 2I: Shared Ledger Compiler"
  ]);
});

test("Step 2 plan chooses exactly one first implementation task", async () => {
  const plan = await readPlan();
  assertIncludes(plan, [
    "## 4. First Implementation Recommendation",
    "recommended_first_task:",
    "Phase 2A.1 - Employee Entry backend duplicate guard",
    "runtime risk:",
    "migration needed:",
    "production data write:",
    "required tests:",
    "acceptance criteria:"
  ]);
});

test("Step 2 plan separates migration and no-migration work", async () => {
  const plan = await readPlan();
  assertIncludes(plan, [
    "## 5. Migration Assessment",
    "| Change | Migration Needed | Reason | Can be staged without migration? |",
    "Durable unique index for source_fingerprint / canonical_fingerprint",
    "Durable Access Card Remark Snapshot table",
    "Durable occupancy_session_id on old records",
    "Canonical Event Common Fields inside entries_json",
    "Anomaly screening in validation response"
  ]);
});

test("Step 2 plan defines test strategy and risk dependencies", async () => {
  const plan = await readPlan();
  assertIncludes(plan, [
    "## 6. Test Strategy",
    "contract test",
    "unit test",
    "fixture test",
    "regression test",
    "forbidden-field test",
    "no-production-write assertion",
    "## 7. Risks and Dependencies",
    "Areas that must not be touched together:",
    "Risk of breaking current upload:",
    "Risk of breaking owner history:",
    "Risk of breaking arrears:",
    "Risk of migration:"
  ]);
});


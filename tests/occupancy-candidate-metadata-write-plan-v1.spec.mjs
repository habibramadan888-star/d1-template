import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/OCCUPANCY_CANDIDATE_METADATA_WRITE_PLAN_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("metadata write plan exists and remains planning-only", async () => {
  const text = await doc();
  assert.match(text, /Occupancy Candidate Metadata Write Plan V1/);
  assert.match(text, /planning only/i);
  assert.match(text, /No runtime implementation/i);
  assert.match(text, /No production data changes/i);
  assert.match(text, /No deploy/i);
});

test("plan defines non-authoritative metadata and separates identity layers", async () => {
  const text = await doc();
  assert.match(text, /non-authoritative/i);
  assert.match(text, /not durable/i);
  assert.match(text, /not final identity/i);
  assert.match(text, /not used for matching/i);
  assert.match(text, /not implemented yet/i);
  assert.match(text, /durable `occupancy_session_id`/i);
});

test("plan states no tenant_card_id replacement and no migration", async () => {
  const text = await doc();
  assert.match(text, /not replace legacy matching/i);
  assert.match(text, /replace `tenant_card_id` matching/i);
  assert.match(text, /no migration/i);
  assert.match(text, /Do not add a table in this step/i);
});

test("plan recommends entries_json as first storage target", async () => {
  const text = await doc();
  assert.match(text, /`entries_json` Per Event Metadata/);
  assert.match(text, /Recommendation: first safe implementation target/i);
  assert.match(text, /Store metadata under each new event anchor in `sessions\.entries_json` only/i);
  assert.match(text, /no migration required/i);
});

test("plan defines proposed metadata shape", async () => {
  const text = await doc();
  for (const field of [
    "occupancy_candidate_metadata",
    "version",
    "occupancy_candidate_v1",
    "classification",
    "non_authoritative",
    "storage_role",
    "metadata_only",
    "durability",
    "not_durable",
    "identity_role",
    "not_final_identity",
    "matching_role",
    "not_used_for_matching",
    "candidate_id",
    "candidate_status",
    "candidate_persistence",
    "metadata_only_not_authoritative",
    "server_upload_preflight",
    "forbidden_inputs_used"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
});

test("plan includes all seven employee event types", async () => {
  const text = await doc();
  for (const eventType of [
    "Rent",
    "Arrears Payment",
    "Deposit In",
    "Deposit Out",
    "Checkout",
    "Expense",
    "Bed Transfer"
  ]) {
    assert.match(text, new RegExp(`### [A-H]\\. ${escaped(eventType)}`));
  }
});

test("plan forbids provider and card identity inputs", async () => {
  const text = await doc();
  for (const forbidden of [
    "card_id",
    "tenant_card_id",
    "hardware card id",
    "provider phone",
    "access-card metadata phone",
    "99099",
    "phone_99099"
  ]) {
    assert.match(text, new RegExp(escaped(forbidden), "i"));
  }
});

test("plan defines unresolved and conflict behavior", async () => {
  const text = await doc();
  assert.match(text, /candidate_unresolved/);
  assert.match(text, /candidate_conflict/);
  assert.match(text, /do not block upload unless existing business validation blocks it/i);
  assert.match(text, /do not make business decisions from this metadata/i);
});

test("plan defines UI and debug visibility rules", async () => {
  const text = await doc();
  assert.match(text, /hidden from normal UI/i);
  assert.match(text, /debug panel/i);
  assert.match(text, /audit panel/i);
  assert.match(text, /not used for customer identity/i);
});

test("plan guarantees no business logic impact", async () => {
  const text = await doc();
  for (const phrase of [
    "alter deposit balance logic",
    "alter arrears matching logic",
    "alter checkout blocking logic",
    "alter bed transfer business state",
    "affect duplicate guard",
    "affect owner history parser",
    "affect financial totals"
  ]) {
    assert.match(text, new RegExp(escaped(phrase), "i"));
  }
});

test("plan defines future implementation phases", async () => {
  const text = await doc();
  for (const phase of ["Phase 2G-1", "Phase 2G-2", "Phase 2G-3", "Phase 2G-4", "Phase 2G-5"]) {
    assert.match(text, new RegExp(escaped(phase)));
  }
  assert.match(text, /store only in `sessions\.entries_json`/i);
});

test("plan defines tests required for future implementation", async () => {
  const text = await doc();
  for (const required of [
    "real upload writes candidate metadata into `entries_json` only",
    "no database migration",
    "no durable occupancy session table",
    "no `tenant_card_id` replacement",
    "forbidden inputs remain false",
    "duplicate guard still works",
    "owner history parser still works",
    "legacy sessions without metadata still work",
    "financial totals remain unchanged"
  ]) {
    assert.match(text, new RegExp(escaped(required), "i"));
  }
});

test("plan defines no-go conditions", async () => {
  const text = await doc();
  for (const condition of [
    "metadata write requires migration",
    "metadata write changes business decisions",
    "metadata uses `card_id`",
    "metadata uses `tenant_card_id`",
    "metadata uses provider phone",
    "metadata uses `99099` phone",
    "metadata breaks owner decoder",
    "metadata causes duplicate guard regression",
    "metadata changes financial totals"
  ]) {
    assert.match(text, new RegExp(escaped(condition), "i"));
  }
});

test("plan recommends first implementation task and states no behavior changed", async () => {
  const text = await doc();
  assert.match(text, /STEP 2G IMPLEMENTATION: Store non-authoritative occupancy_candidate_metadata in entries_json for new uploaded events only/i);
  assert.match(text, /GO_TO_METADATA_WRITE_IMPLEMENTATION/);
  assert.match(text, /Runtime behavior changed in this step: no/i);
  assert.match(text, /Production data changed in this step: no/i);
  assert.match(text, /Migration in this step: no/i);
  assert.match(text, /Deploy in this step: no/i);
});

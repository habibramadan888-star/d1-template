import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import {
  findBedTransferForbiddenIdentityFields,
  sanitizeBedTransferIdentityFields
} from "../modules/employees/bed-transfer-phase1-contract.mjs";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = source.indexOf(`__name(${name},`, start);
  assert.ok(end > start, `${name} block must end with __name marker`);
  return source.slice(start, end);
}

function employeeEntryUploadType(entry = {}) {
  const event = String(entry?.event_type || entry?.eventType || "").trim().toLowerCase();
  if (event === "bed_transfer") return "TF";
  if (event === "bed_transfer_fee") return "TFF";
  if (event) return "";
  const raw = String(entry?.type || entry?.reason_code || "").trim().toUpperCase();
  return ({ TF: "TF", TFF: "TFF", T: "TF", TRANSFER: "TF", BED_TRANSFER: "TF", BED_TRANSFER_FEE: "TFF" })[raw] || "";
}

async function firewallContext() {
  const source = await readFile(workerPath, "utf8");
  const context = { findBedTransferForbiddenIdentityFields, employeeEntryUploadType };
  vm.createContext(context);
  vm.runInContext([
    functionBlock(source, "employeeEntryBedTransferInputRows"),
    functionBlock(source, "bedTransferForbiddenIdentityFieldsFromBody"),
    functionBlock(source, "bedTransferForbiddenIdentityFailure")
  ].join("\n"), context);
  return { source, context };
}

test("all required raw Bed Transfer locations reject provider identity", async () => {
  const { context } = await firewallContext();
  const cases = [
    [{ event_type: "bed_transfer", tenant_card_id: "value-top" }, "tenant_card_id"],
    [{ entry: { event_type: "bed_transfer", card_id: "value-entry" } }, "card_id"],
    [{ entries: [{ type: "TF", old_ttlock_ref: "value-entries" }] }, "old_ttlock_ref"],
    [{ session: { entries: [{ type: "TFF", provider_phone: "value-session" }] } }, "provider_phone"],
    [{ entry: { type: "TF", source_context: { phone_99099: "value-source" } } }, "phone_99099"],
    [{ entry: { type: "TF", access_snapshot_context: { creator_phone: "value-snapshot" } } }, "creator_phone"],
    [{ entry: { type: "TF", transfer_context: { audit_context: { provider_metadata: { account: "value-metadata" } } } } }, "provider_metadata"]
  ];

  for (const [body, field] of cases) {
    const result = context.bedTransferForbiddenIdentityFailure(body, 0);
    assert.equal(result.error_code, "BED_TRANSFER_FORBIDDEN_IDENTITY_FIELD");
    assert.equal(result.event_type, "bed_transfer");
    assert.equal(result.write_attempted, false);
    assert.deepEqual(Array.from(result.forbidden_fields), [field]);
    assert.equal(JSON.stringify(result).includes("value-"), false);
  }
});

test("snake_case and camelCase aliases are rejected with sorted deduplicated names", async () => {
  const { context } = await firewallContext();
  const aliases = {
    tenant_card_id: "x", tenantCardId: "x", card_id: "x", cardId: "x",
    old_ttlock_ref: "x", oldTtlockRef: "x", provider_phone: "x", providerPhone: "x",
    phone_99099: "x", phone99099: "x", creator_phone: "x", creatorPhone: "x",
    card_creation_time: "x", cardCreationTime: "x", ttlock_provider_metadata: { value: "x" },
    ttlockProviderMetadata: { value: "x" }, provider_metadata: { value: "x" }, providerMetadata: { value: "x" }
  };
  const result = context.bedTransferForbiddenIdentityFailure({ entry: { type: "TF", source_context: aliases } }, 0);
  const expected = Object.keys(aliases).sort((a, b) => a.localeCompare(b));
  assert.deepEqual(Array.from(result.forbidden_fields), expected);
  assert.equal(new Set(result.forbidden_fields).size, result.forbidden_fields.length);
  assert.equal(JSON.stringify(result).includes('"x"'), false);
});

test("legal physical context survives while server-managed context is removed", () => {
  const legal = {
    event_type: "bed_transfer",
    from_bed: "146",
    to_bed: "111",
    corpid: "corp-a",
    company_scope: "corp-a",
    property_id: "property-a",
    physical_bed_status: "vacant",
    physical_bed_status_source: "access_snapshot_E_marker",
    parsed_vacancy_marker: true,
    parsed_deposit_amount: 200,
    parsed_checkin_mmdd: "0708",
    normalized_expiry_value: "2026-08-08T12:00:00+04:00",
    snapshot_timestamp: "2026-07-11T12:00:00+04:00",
    snapshot_provenance: "canonical_access_snapshot",
    snapshot_fingerprint: "safe-fingerprint",
    canonical_arrears_ref: "arrears-safe",
    source_session_id: "session-safe",
    source_entry_id: "entry-safe",
    source_anchor_id: "anchor-safe",
    providerMetadata: { secret: "must-remove" }
  };
  const sanitized = sanitizeBedTransferIdentityFields(legal);
  assert.equal(sanitized.providerMetadata, undefined);
  for (const key of ["corpid", "company_scope", "snapshot_fingerprint", "snapshot_provenance"]) assert.equal(sanitized[key], undefined);
  const removed = new Set(["providerMetadata", "corpid", "company_scope", "snapshot_fingerprint", "snapshot_provenance"]);
  for (const key of Object.keys(legal).filter(key => !removed.has(key))) {
    assert.deepEqual(sanitized[key], legal[key], key);
  }
  assert.deepEqual(findBedTransferForbiddenIdentityFields(sanitized), []);
});

test("other employee event types are not rejected by Bed Transfer firewall", async () => {
  const { context } = await firewallContext();
  for (const [event_type, type] of [["rent", "R"], ["arrears_payment", "AP"], ["deposit_in", "D"], ["deposit_out", "DR"], ["checkout", "CO"], ["expense", "E"]]) {
    assert.equal(context.bedTransferForbiddenIdentityFailure({ entry: { event_type, type, tenant_card_id: "legacy-other-event" } }, 0), null);
  }
});

test("Worker rejects before D1 and preserves existing Bed Transfer validation and write gates", async () => {
  const { source } = await firewallContext();
  const validator = functionBlock(source, "validateEmployeeEntryUploadPayload");
  const writer = functionBlock(source, "handleEmployeeEntry");
  const validateRoute = functionBlock(source, "handleEmployeeEntryValidate");
  const normalizer = functionBlock(source, "normalizeEmployeeEntryForValidation");

  assert.ok(validator.indexOf("bedTransferForbiddenIdentityFailure") < validator.indexOf("normalizeEmployeeEntryBodyForValidation"));
  assert.ok(validator.indexOf("bedTransferForbiddenIdentityFailure") < validator.indexOf('empTableExists(env,"sessions")'));
  assert.match(validator, /validateEmployeeBedTransferPhase1\(env,user,entry,normalized,opts\)/);
  assert.ok(writer.indexOf("bedTransferForbiddenIdentityFailure") < writer.indexOf('empTableExists(env,"sessions")'));
  assert.match(writer, /\["TF","TFF"\]\.includes\(writeGateType\)&&!bedTransferWriteApproved\(env\)/);
  assert.match(validateRoute, /if\(!result\.ok\)return json\(\{success:false,\.\.\.result\},422\)/);
  assert.match(normalizer, /\["TF","TFF"\]\.includes\(type\)\?sanitizeBedTransferIdentityFields\(entry\):entry/);
});

test("direct writer remains removed and no provider identity derivation remains", async () => {
  const source = await readFile(workerPath, "utf8");
  const direct = functionBlock(source, "handleEmployeeBedTransferCreate");
  assert.match(direct, /return bedTransferCanonicalPathRequiredResponse\(\);/);
  assert.doesNotMatch(direct, /customer_id|customer_code|tenant_card_id|old_ttlock_ref|provider_phone|phone_99099/);
});

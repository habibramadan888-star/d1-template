import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function loadHarness() {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const start = worker.indexOf("const entryAnchorContract");
  const end = worker.indexOf("function cloudArrearsSessionIsActive", start);
  assert.ok(start > 0 && end > start, "entry anchor block not found");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `
    function __name(fn){ return fn; }
    function cleanText(value,max=10000){ return Array.from(String(value ?? '')).join('').trim().slice(0,max); }
    function cleanDate(value){ return cleanText(value,32).slice(0,10); }
    ${worker.slice(start, end)}
    globalThis.classifyProviderMetadataAuthority = classifyProviderMetadataAuthority;
    globalThis.isNonAuthoritativeProviderPhone = isNonAuthoritativeProviderPhone;
    globalThis.sanitizeBusinessContactFromProviderMetadata = sanitizeBusinessContactFromProviderMetadata;
    globalThis.assertNoProviderMetadataInBusinessIdentity = assertNoProviderMetadataInBusinessIdentity;
    globalThis.buildSafeBusinessIdentityContext = buildSafeBusinessIdentityContext;
    globalThis.buildCanonicalEventFingerprint = buildCanonicalEventFingerprint;
    globalThis.buildEmployeeEntryDuplicateKeys = buildEmployeeEntryDuplicateKeys;
    globalThis.checkEmployeeEntryDuplicates = checkEmployeeEntryDuplicates;
    `,
    sandbox
  );
  return sandbox;
}

function rent(overrides = {}) {
  return {
    type: "R",
    event_id: "rent-001",
    id: "rent-001",
    room: "334",
    amount: 700,
    paid: 700,
    due: 780,
    period_due: 780,
    pay_type: "C",
    period_start: "2026-08-01",
    period_end: "2026-09-01",
    arrear_handling: "ARREAR",
    arrear_promise_date: "2026-07-10",
    arrear_reason_detail: "111",
    ...overrides
  };
}

test("provider card ids are classified non-authoritative", async () => {
  const h = await loadHarness();
  assert.equal(h.classifyProviderMetadataAuthority({ field: "card_id", value: "card-1" }).authority, "non_authoritative");
  assert.equal(h.classifyProviderMetadataAuthority({ field: "tenant_card_id", value: "tenant-card-1" }).authority, "non_authoritative");
});

test("provider and 99099 phones are classified non-authoritative", async () => {
  const h = await loadHarness();
  assert.equal(h.isNonAuthoritativeProviderPhone("+971525199099", "access_card_metadata"), true);
  assert.equal(h.isNonAuthoritativeProviderPhone("+9715011199099", "staff_entered"), true);
  assert.equal(h.classifyProviderMetadataAuthority({ field: "provider_phone", value: "+971525199099", source: "provider_card_metadata" }).authority, "non_authoritative");
});

test("provider phones cannot become business customer or tenant phones", async () => {
  const h = await loadHarness();
  assert.equal(h.sanitizeBusinessContactFromProviderMetadata("+971525199099", { source: "provider_card_metadata" }), "");
  assert.equal(h.sanitizeBusinessContactFromProviderMetadata("+9715011199099", { source: "staff_entered_customer_phone" }), "");
  const context = h.buildSafeBusinessIdentityContext({
    customer_phone: "+971525199099",
    customer_phone_source: "access_card_metadata",
    tenant_phone: "+9715011199099",
    tenant_phone_source: "staff_entered",
    contact_phone: "+971501234567",
    contact_phone_source: "provider_phone"
  });
  assert.equal(context.customer_phone, "");
  assert.equal(context.tenant_phone, "");
  assert.equal(context.contact_phone, "");
});

test("explicit staff-entered and left-with-arrears phones are allowed", async () => {
  const h = await loadHarness();
  assert.equal(h.sanitizeBusinessContactFromProviderMetadata("+971501234567", { source: "staff_entered_customer_phone" }), "+971501234567");
  assert.equal(h.sanitizeBusinessContactFromProviderMetadata("+971507654321", { source: "explicit_left_with_arrears_phone" }), "+971507654321");
});

test("access card remark is context only, not deposit ledger authority", async () => {
  const h = await loadHarness();
  const authority = h.classifyProviderMetadataAuthority({ field: "card_remark", value: "334 D200 0710" });
  const context = h.buildSafeBusinessIdentityContext({ bed: "334", card_remark: "334 D200 0710 deposit 300" });
  assert.equal(authority.authority, "context_only");
  assert.equal(context.card_remark_authority, "context_only");
  assert.equal(context.deposit_context_authority, "context_only");
});

test("business identity guard rejects provider metadata fields and contaminated fingerprints", async () => {
  const h = await loadHarness();
  const result = h.assertNoProviderMetadataInBusinessIdentity({
    card_id: "card-1",
    tenant_card_id: "tenant-card-1",
    customer_phone: "+971525199099",
    customer_phone_source: "provider_card_metadata",
    canonical_fingerprint: "homelink|rent|tenant_card_id|+971525199099"
  });
  assert.equal(result.ok, false);
  assert.ok(result.violations.length >= 4);
});

test("canonical fingerprint excludes card ids and provider phones even if supplied", async () => {
  const h = await loadHarness();
  const base = h.buildCanonicalEventFingerprint(rent(), { corpid: "homelink" });
  const withProviderMetadata = h.buildCanonicalEventFingerprint(
    rent({
      card_id: "card-should-not-appear",
      tenant_card_id: "tenant-card-should-not-appear",
      provider_phone: "+971525199099",
      whatsapp_phone: "+971525199099",
      whatsapp_phone_source: "provider_card_metadata",
      canonical_fingerprint: "bad|tenant_card_id|+971525199099"
    }),
    { corpid: "homelink" }
  );
  assert.equal(withProviderMetadata, base);
  assert.doesNotMatch(withProviderMetadata, /card-should-not-appear|tenant-card-should-not-appear|99099|971525199099|bad/);
});

test("duplicate keys use server-derived canonical fingerprint, not supplied contaminated value", async () => {
  const h = await loadHarness();
  const keys = h.buildEmployeeEntryDuplicateKeys(
    rent({
      canonical_fingerprint: "bad|tenant_card_id|+971525199099",
      source_fingerprint: "bad|card_id|+971525199099"
    }),
    { corpid: "homelink" },
    0
  );
  assert.equal(keys.source_fingerprint, "");
  assert.doesNotMatch(keys.canonical_fingerprint, /bad|tenant_card_id|971525199099|card_id/);
});


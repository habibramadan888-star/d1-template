import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function loadDuplicateGuardHarness() {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const start = worker.indexOf("const entryAnchorContract");
  const end = worker.indexOf("function cloudArrearsSessionIsActive", start);
  assert.ok(start > 0 && end > start, "employee anchor/duplicate guard block not found");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `
    function __name(fn){ return fn; }
    function cleanText(value,max=10000){ return Array.from(String(value ?? '')).join('').trim().slice(0,max); }
    function cleanDate(value){ return cleanText(value,32).slice(0,10); }
    ${worker.slice(start, end)}
    globalThis.buildCanonicalEventFingerprint = buildCanonicalEventFingerprint;
    globalThis.buildEmployeeEntryDuplicateKeys = buildEmployeeEntryDuplicateKeys;
    globalThis.checkEmployeeEntryDuplicates = checkEmployeeEntryDuplicates;
    `,
    sandbox
  );
  return sandbox;
}

function fakeEnv({ txRows = {}, sessions = [] } = {}) {
  return {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async first() {
                if (/FROM transactions/i.test(sql)) {
                  return txRows[args[0]] || null;
                }
                return null;
              },
              async all() {
                if (/FROM sessions/i.test(sql)) {
                  return { results: sessions };
                }
                return { results: [] };
              }
            };
          }
        };
      }
    }
  };
}

function rent(overrides = {}) {
  return {
    type: "R",
    event_id: "ent-rent",
    id: "ent-rent",
    room: "334",
    amount: 700,
    paid: 700,
    due: 780,
    period_due: 780,
    pay_type: "C",
    period_start: "2026-08-01",
    period_end: "2026-09-01",
    arrear_promise_date: "2026-07-10",
    arrear_reason_detail: "111",
    ...overrides
  };
}

function arrearsPayment(overrides = {}) {
  return {
    type: "AP",
    event_id: "ent-ap",
    id: "ent-ap",
    room: "334",
    amount: 80,
    payment_amount: 80,
    pay_type: "C",
    linked_task_id: "task-a",
    arrears_ref: "task-a",
    original_arrears_amount: 80,
    already_paid_amount: 0,
    remaining_arrears_before_payment: 80,
    remaining_arrears_after_payment: 0,
    remaining_arrears: 0,
    settlement_status: "settled",
    ...overrides
  };
}

function bodyFor(entries, sessionId = "S-new", entry = entries[0]) {
  return {
    entry,
    session: {
      id: sessionId,
      anchor_id: `EMPV3-20260707-abdul-${sessionId}`,
      entries
    }
  };
}

test("canonical fingerprint excludes provider identity fields and UI status", async () => {
  const h = await loadDuplicateGuardHarness();
  const withProviderFields = h.buildCanonicalEventFingerprint(
    rent({
      event_id: "ent-a",
      id: "ent-a",
      card_id: "card-should-not-appear",
      cardId: "provider-card-should-not-appear",
      tenant_card_id: "tenant-card-should-not-appear",
      provider_phone: "+971525199099",
      whatsapp_phone: "+971525199099",
      sync_status: "SYNCED",
      upload_status: "VALIDATION_FAILED"
    }),
    { corpid: "homelink" }
  );

  assert.doesNotMatch(withProviderFields, /card-should-not-appear/i);
  assert.doesNotMatch(withProviderFields, /tenant-card-should-not-appear/i);
  assert.doesNotMatch(withProviderFields, /provider-card-should-not-appear/i);
  assert.doesNotMatch(withProviderFields, /99099/);
  assert.doesNotMatch(withProviderFields, /SYNCED|VALIDATION_FAILED/i);
});

test("duplicate event_id is rejected against existing non-void transaction", async () => {
  const h = await loadDuplicateGuardHarness();
  const result = await h.checkEmployeeEntryDuplicates(
    fakeEnv({
      txRows: {
        "ent-rent": {
          id: "ent-rent",
          session_id: "S-old",
          created_at: "2026-07-07T10:00:00Z",
          type: "R"
        }
      }
    }),
    { corpid: "homelink" },
    bodyFor([rent()])
  );

  assert.equal(result.ok, false);
  assert.equal(result.error_code, "DUPLICATE_EVENT_FOUND");
  assert.equal(result.duplicates[0].duplicate_type, "event_id");
});

test("duplicate source_fingerprint is rejected against stored session anchors", async () => {
  const h = await loadDuplicateGuardHarness();
  const stored = rent({ event_id: "old-rent", id: "old-rent", source_fingerprint: "source-001" });
  const result = await h.checkEmployeeEntryDuplicates(
    fakeEnv({
      sessions: [
        {
          id: "S-old",
          anchor_id: "EMPV3-old",
          created_at: "2026-07-07T10:00:00Z",
          entries_json: JSON.stringify({ entries: [stored] }),
          export_text: ""
        }
      ]
    }),
    { corpid: "homelink" },
    bodyFor([rent({ event_id: "new-rent", id: "new-rent", source_fingerprint: "source-001", period_start: "2026-09-01", period_end: "2026-10-01" })])
  );

  assert.equal(result.ok, false);
  assert.equal(result.error_code, "DUPLICATE_SOURCE_FINGERPRINT");
});

test("duplicate canonical_fingerprint is rejected against stored session anchors", async () => {
  const h = await loadDuplicateGuardHarness();
  const stored = rent({ event_id: "old-rent", id: "old-rent" });
  const incoming = rent({ event_id: "new-rent", id: "new-rent" });
  const result = await h.checkEmployeeEntryDuplicates(
    fakeEnv({
      sessions: [
        {
          id: "S-old",
          anchor_id: "EMPV3-old",
          created_at: "2026-07-07T10:00:00Z",
          entries_json: JSON.stringify({ entries: [stored] }),
          export_text: ""
        }
      ]
    }),
    { corpid: "homelink" },
    bodyFor([incoming])
  );

  assert.equal(result.ok, false);
  assert.equal(result.error_code, "DUPLICATE_CANONICAL_FINGERPRINT");
  assert.equal(result.duplicates[0].duplicate_type, "canonical_fingerprint");
});

test("duplicate records inside same payload are rejected before DB scan", async () => {
  const h = await loadDuplicateGuardHarness();
  const result = await h.checkEmployeeEntryDuplicates(
    fakeEnv(),
    { corpid: "homelink" },
    bodyFor([
      rent({ event_id: "ent-a", id: "ent-a" }),
      rent({ event_id: "ent-b", id: "ent-b" })
    ])
  );

  assert.equal(result.ok, false);
  assert.equal(result.error_code, "DUPLICATE_EVENT_IN_PAYLOAD");
});

test("production duplicate incident fixture rejects the whole mixed batch", async () => {
  const h = await loadDuplicateGuardHarness();
  const old334 = rent({ event_id: "old-334", id: "old-334", room: "334", amount: 700, paid: 700, due: 780, period_due: 780 });
  const old134 = rent({ event_id: "old-134", id: "old-134", room: "134", amount: 770, paid: 770, due: 770, period_due: 770, period_start: "2026-08-01", period_end: "2026-09-01" });
  const incomingAp = arrearsPayment({ event_id: "new-ap-334", id: "new-ap-334", linked_task_id: "task-mraw1ygi-6094bf14", arrears_ref: "task-mraw1ygi-6094bf14" });
  const dup334 = rent({ event_id: "new-334", id: "new-334", room: "334", amount: 700, paid: 700, due: 780, period_due: 780 });
  const dup134 = rent({ event_id: "new-134", id: "new-134", room: "134", amount: 770, paid: 770, due: 770, period_due: 770, period_start: "2026-08-01", period_end: "2026-09-01" });

  const result = await h.checkEmployeeEntryDuplicates(
    fakeEnv({
      sessions: [
        {
          id: "S-w1ofc",
          anchor_id: "EMPV3-20260707-abdul-w1ofc",
          created_at: "2026-07-07T10:00:00Z",
          entries_json: JSON.stringify({ entries: [old334, old134] }),
          export_text: ""
        }
      ]
    }),
    { corpid: "homelink" },
    bodyFor([incomingAp, dup334, dup134], "S-x6wio", incomingAp)
  );

  assert.equal(result.ok, false);
  assert.equal(result.error_code, "DUPLICATE_CANONICAL_FINGERPRINT");
  assert.equal(result.duplicates.length, 2);
  assert.deepEqual(Array.from(result.duplicates, (item) => item.incoming_event_id).sort(), ["new-134", "new-334"]);
});

test("duplicate stale short-paid rent is caught before missing arrear handling validation", async () => {
  const h = await loadDuplicateGuardHarness();
  const existing = rent({
    event_id: "ent20260707-w1ofc-01",
    id: "ent20260707-w1ofc-01",
    source_fingerprint: "homelink|334|2026-07-15|2026-08-15|ent20260707-w1ofc-01",
    room: "334",
    amount: 700,
    paid: 700,
    due: 780,
    period_due: 780,
    period_start: "2026-07-15",
    period_end: "2026-08-15"
  });
  const staleIncoming = rent({
    event_id: "ent20260707-w1ofc-01",
    id: "ent20260707-w1ofc-01",
    source_fingerprint: "homelink|334|2026-07-15|2026-08-15|ent20260707-w1ofc-01",
    room: "334",
    amount: 700,
    paid: 700,
    due: 780,
    period_due: 780,
    period_start: "2026-07-15",
    period_end: "2026-08-15",
    arrear_handling: "",
    arrear_promise_date: "",
    arrear_reason_detail: ""
  });

  const result = await h.checkEmployeeEntryDuplicates(
    fakeEnv({
      txRows: {
        "ent20260707-w1ofc-01": {
          id: "ent20260707-w1ofc-01",
          session_id: "S-w1ofc",
          created_at: "2026-07-07T10:00:00Z",
          type: "R"
        }
      },
      sessions: [
        {
          id: "S-w1ofc",
          anchor_id: "EMPV3-20260707-abdul-w1ofc",
          created_at: "2026-07-07T10:00:00Z",
          entries_json: JSON.stringify({ entries: [existing] }),
          export_text: ""
        }
      ]
    }),
    { corpid: "homelink" },
    bodyFor([staleIncoming], "S-new", staleIncoming)
  );

  assert.equal(result.ok, false);
  assert.match(result.error_code, /DUPLICATE_EVENT_FOUND|DUPLICATE_SOURCE_FINGERPRINT|DUPLICATE_CANONICAL_FINGERPRINT/);
  assert.notEqual(result.error_code, "ARREAR_TASK_REQUIRED_FOR_SHORTFALL");
  assert.equal(result.duplicates[0].incoming_event_id, "ent20260707-w1ofc-01");
});

test("same bed and amount with different rent period is not a duplicate", async () => {
  const h = await loadDuplicateGuardHarness();
  const stored = rent({ event_id: "old-rent", id: "old-rent", period_start: "2026-08-01", period_end: "2026-09-01" });
  const incoming = rent({ event_id: "new-rent", id: "new-rent", period_start: "2026-09-01", period_end: "2026-10-01" });
  const result = await h.checkEmployeeEntryDuplicates(
    fakeEnv({
      sessions: [
        {
          id: "S-old",
          anchor_id: "EMPV3-old",
          created_at: "2026-07-07T10:00:00Z",
          entries_json: JSON.stringify({ entries: [stored] }),
          export_text: ""
        }
      ]
    }),
    { corpid: "homelink" },
    bodyFor([incoming])
  );

  assert.equal(result.ok, true);
});

test("same arrears amount with different arrears_ref is not a duplicate", async () => {
  const h = await loadDuplicateGuardHarness();
  const stored = arrearsPayment({ event_id: "old-ap", id: "old-ap", linked_task_id: "task-a", arrears_ref: "task-a" });
  const incoming = arrearsPayment({ event_id: "new-ap", id: "new-ap", linked_task_id: "task-b", arrears_ref: "task-b" });
  const result = await h.checkEmployeeEntryDuplicates(
    fakeEnv({
      sessions: [
        {
          id: "S-old",
          anchor_id: "EMPV3-old",
          created_at: "2026-07-07T10:00:00Z",
          entries_json: JSON.stringify({ entries: [stored] }),
          export_text: ""
        }
      ]
    }),
    { corpid: "homelink" },
    bodyFor([incoming])
  );

  assert.equal(result.ok, true);
});

test("exact retry of same completed upload session is idempotent no-op", async () => {
  const h = await loadDuplicateGuardHarness();
  const entries = [rent({ event_id: "ent-1", id: "ent-1" }), rent({ event_id: "ent-2", id: "ent-2", room: "134", amount: 770, paid: 770, due: 770, period_due: 770 })];
  const result = await h.checkEmployeeEntryDuplicates(
    fakeEnv({
      txRows: {
        "ent-1": { id: "ent-1", session_id: "S-same", created_at: "2026-07-07T10:00:00Z", type: "R" },
        "ent-2": { id: "ent-2", session_id: "S-same", created_at: "2026-07-07T10:00:00Z", type: "R" }
      },
      sessions: [
        {
          id: "S-same",
          anchor_id: "EMPV3-same",
          created_at: "2026-07-07T10:00:00Z",
          entries_json: JSON.stringify({ entries }),
          export_text: ""
        }
      ]
    }),
    { corpid: "homelink" },
    bodyFor(entries, "S-same")
  );

  assert.equal(result.ok, true);
  assert.equal(result.idempotent, true);
  assert.equal(result.existing_session_id, "S-same");
});

test("validate and real upload routes both run duplicate guard before writes", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  assert.match(worker, /function buildEmployeeEntryDuplicateKeys/);
  assert.match(worker, /function buildCanonicalEventFingerprint/);
  assert.match(worker, /async function checkEmployeeEntryDuplicates/);
  assert.match(worker, /const duplicateGuard=await checkEmployeeEntryDuplicates\(env,user,body,\{event_index:eventIndex\}\)/);
  assert.match(worker, /if\(validationResult\.idempotent\)/);
  assert.match(worker, /no_write:true/);
  const validatePayloadStart = worker.indexOf("async function validateEmployeeEntryUploadPayload(env,user,body,opts={})");
  const duplicateGuardStart = worker.indexOf("const duplicateGuard=await checkEmployeeEntryDuplicates(env,user,body,{event_index:eventIndex})", validatePayloadStart);
  const businessValidationStart = worker.indexOf("const eventFieldValidation=validateEmployeeEntryUploadEventFields", validatePayloadStart);
  const shortPaidValidationStart = worker.indexOf('employeeEntryValidationFailure("rent_short_paid","ARREAR_TASK_REQUIRED_FOR_SHORTFALL"', validatePayloadStart);
  assert.ok(duplicateGuardStart > validatePayloadStart && duplicateGuardStart < businessValidationStart, "duplicate preflight must run before event-specific business validation");
  assert.ok(duplicateGuardStart < shortPaidValidationStart, "duplicate preflight must run before rent short-paid validation");
  const handleStart = worker.indexOf("async function handleEmployeeEntry(request,env,user)");
  const writeStart = worker.indexOf("await empInsertDynamic(env,\"sessions\"", handleStart);
  const validateStart = worker.indexOf("validateEmployeeEntryUploadPayload(env,user,body", handleStart);
  assert.ok(validateStart > handleStart && validateStart < writeStart, "real upload must validate before session write");
});

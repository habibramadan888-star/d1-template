import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const employeePath = new URL("../deploy-worker/public/employee-v3.html", import.meta.url);

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} must exist`);
  const marker = `__name(${name},`;
  const namedEnd = source.indexOf(marker, start);
  if (namedEnd > start) return source.slice(start, namedEnd);
  const paramsStart = source.indexOf("(", start);
  let paramsDepth = 0;
  let bodyStart = -1;
  for (let index = paramsStart; index < source.length; index += 1) {
    if (source[index] === "(") paramsDepth += 1;
    if (source[index] === ")" && --paramsDepth === 0) { bodyStart = source.indexOf("{", index); break; }
  }
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} must close`);
}

test("exit-event snapshot policy makes zero external calls for empty, expired, unavailable, and warm cache", async () => {
  const worker = await readFile(workerPath, "utf8");
  const block = functionBlock(worker, "getCanonicalTTLockSnapshot");
  let cached = null;
  const counts = { load: 0, oauth: 0, lockList: 0, identityCardList: 0, fetch: 0, writes: 0 };
  const getSnapshot = new Function(
    "cleanText", "qaAcceptanceEnabled", "ttlockScopeKey", "ttlockKvReadJson", "ttlockSafeLog", "ttlockLiveFetchAllowed",
    "ttlockSnapshotFlights", "loadLockCards", "ttlockKvWriteJson", "TTLOCK_READ_CACHE_MAX_AGE_MS",
    `${block}; return getCanonicalTTLockSnapshot;`
  )(
    value => String(value || "").trim(),
    () => false,
    () => "scope",
    async () => cached,
    () => {},
    (_env, context) => context.allow_live_fetch !== false,
    new Map(),
    async () => { counts.load += 1; counts.oauth += 1; counts.lockList += 1; counts.identityCardList += 1; counts.fetch += 1; return { error: "unexpected_live_call" }; },
    async () => { counts.writes += 1; },
    300000
  );

  for (const route of ["deposit_out", "checkout", "left_with_arrears"]) {
    cached = null;
    const empty = await getSnapshot({ APP_ENV: "internal_beta" }, "corp", { request_context: { allow_live_fetch: false, route_category: route } });
    assert.equal(empty.error, "TTLOCK_LIVE_FETCH_DISABLED_FOR_EXIT_EVENT");
    assert.equal(empty._ttlock_meta.external_call_count, 0);
  }

  cached = { roomsData: { 144: [] }, locksCount: 1, observed_at: new Date(Date.now() - 600000).toISOString() };
  const expired = await getSnapshot({ APP_ENV: "internal_beta" }, "corp", { request_context: { allow_live_fetch: false, route_category: "checkout" }, max_age_ms: 60000 });
  assert.equal(expired.error, "TTLOCK_LIVE_FETCH_DISABLED_FOR_EXIT_EVENT");
  assert.equal(expired._ttlock_meta.external_call_count, 0);

  cached = { roomsData: { 144: [] }, locksCount: 1, observed_at: new Date().toISOString() };
  const warm = await getSnapshot({ APP_ENV: "internal_beta" }, "corp", { request_context: { allow_live_fetch: false, route_category: "deposit_out" }, max_age_ms: 60000 });
  assert.equal(warm.data_source, "ttl_cache");
  assert.equal(warm._ttlock_meta.external_call_count, 0);
  assert.deepEqual(counts, { load: 0, oauth: 0, lockList: 0, identityCardList: 0, fetch: 0, writes: 0 });
});

test("incomplete Checkout history is nonblocking and requires Owner Review", async () => {
  const worker = await readFile(workerPath, "utf8");
  const block = functionBlock(worker, "employeeExitEventReference");
  const reference = new Function(
    "cleanText", "canonicalDepositAuditEventsForBed", "canonicalDepositMoney",
    `${block}; return employeeExitEventReference;`
  )(
    value => String(value || ""),
    async () => [],
    value => Math.round(Number(value || 0) * 100) / 100
  );
  const result = await reference({}, {}, { room: "144" }, "CO");
  assert.equal(result.owner_review_required, true);
  assert.equal(result.server_fields.owner_approval_required, true);
  assert.equal(result.server_fields.owner_approval_status, "pending_owner_review");
  assert.ok(result.warnings.includes("CHECKOUT_HISTORICAL_CONTEXT_INCOMPLETE"));
});

test("Deposit Out and Checkout validation ignore current access-card lifecycle state", async () => {
  const worker = await readFile(workerPath, "utf8");
  const depositBlock = functionBlock(worker, "validateDepositOutUploadFields");
  const checkoutBlock = functionBlock(worker, "validateCheckoutUploadFields");
  const build = block => new Function(
    "employeeEntryUploadAmount", "employeeEntryUploadHasValue", "employeeEntryValidationFailure",
    `${block}; return ${block.includes("validateDepositOut") ? "validateDepositOutUploadFields" : "validateCheckoutUploadFields"};`
  )(
    value => Number(value || 0),
    value => value !== undefined && value !== null && String(value).trim() !== "",
    (...args) => ({ args })
  );
  const validateDeposit = build(depositBlock);
  const validateCheckout = build(checkoutBlock);

  for (const access_state of ["deleted", "expired", "controlled", "vacant", "D_missing", "unavailable"]) {
    assert.equal(validateDeposit({ room: "144", amount: 100, refund_method: "cash", refund_reason: "actual refund", access_state }, {}, 0, {}), null);
    assert.equal(validateCheckout({ room: "144", checkout_mode: "normal", checkout_date: "2026-07-15", access_state }, {}, 0, {}), null);
    assert.equal(validateCheckout({ room: "144", checkout_mode: "left_with_arrears", left_with_arrears: true, left_arrears_amount: 70, note: "left owing", access_state }, {}, 0, {}), null);
  }
});

test("Left With Arrears creates a canonical projection without an existing task or promised date", async () => {
  const worker = await readFile(workerPath, "utf8");
  const applyBlock = functionBlock(worker, "empApplyLeftWithArrearsMetadata");
  const apply = new Function(
    "cleanId", "empLeftWithArrearsMetaFromEntry", "cleanText", "empNow", "empEvent",
    `${applyBlock}; return empApplyLeftWithArrearsMetadata;`
  )(
    value => String(value || "").replace(/[^A-Za-z0-9_-]/g, ""),
    (entry, taskId) => ({ task_id: taskId, arrear_amount: entry.left_arrears_amount }),
    value => String(value || ""),
    () => "2026-07-15T00:00:00Z",
    async () => {}
  );
  const env = { DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } };
  const result = await apply(env, { corpid: "corp", userid: "staff" }, { left_with_arrears: true, cloud_arrears_ref: "left-with-arrears-S-E", left_arrears_amount: 70 }, "E", "staff", "2026-07-15T00:00:00Z");
  assert.equal(result.ok, true);
  assert.equal(result.created, true);
  assert.equal(result.materialized_from, "sessions.entries_json");
  assert.match(worker, /left-with-arrears-\$\{sessionId\}-\$\{entryId\}/);
});

test("Finance projects Deposit Out as refund outflow and Left With Arrears as non-cash arrears opened", async () => {
  const worker = await readFile(workerPath, "utf8");
  const block = functionBlock(worker, "canonicalFinanceProjectionApplyAnchor");
  const apply = new Function(
    "canonicalFinanceProjectionEventType", "canonicalFinanceProjectionPaymentMethod", "canonicalFinanceProjectionAmount",
    "canonicalFinanceProjectionAddInflow", "canonicalFinanceProjectionAddOutflow",
    `${block}; return canonicalFinanceProjectionApplyAnchor;`
  )(
    anchor => anchor.event_type,
    anchor => anchor.payment_method || "cash",
    (...values) => values.map(Number).find(value => value > 0) || 0,
    (totals, method, amount) => { totals[method === "bank" ? "bank_received" : "cash_received"] += amount; totals.gross_received += amount; },
    (totals, method, amount) => { totals[method === "bank" ? "bank_out" : "cash_out"] += amount; }
  );
  const totals = { cash_received: 0, bank_received: 0, gross_received: 0, cash_out: 0, bank_out: 0, deposit_refund: 0, expenses: 0, arrears_opened_amount: 0, arrears_opened_count: 0, rent_income: 0, arrears_repaid: 0, bed_transfer_fee_arrears_repaid: 0, bed_price_difference_arrears_repaid: 0, deposit_received: 0, bed_transfer_fee: 0 };
  apply(totals, { event_type: "deposit_out", actual_refund_amount: 100, payment_method: "bank" });
  apply(totals, { event_type: "left_with_arrears", left_arrears_amount: 70 });
  assert.equal(totals.deposit_refund, 100);
  assert.equal(totals.bank_out, 100);
  assert.equal(totals.expenses, 0);
  assert.equal(totals.arrears_opened_amount, 70);
  assert.equal(totals.arrears_opened_count, 1);
  assert.equal(totals.cash_received + totals.bank_received + totals.gross_received + totals.rent_income, 0);
});

test("exit-event bed input uses only the no-live deposit reference endpoint", async () => {
  const employee = await readFile(employeePath, "utf8");
  const blocks = ["employeeExitEventSelected", "lookupBed", "loadDepositBalance"].map(name => functionBlock(employee, name)).join("\n");
  const fields = new Map([
    ["entryType", { value: "DR" }], ["bed", { value: "144" }], ["tenantName", { value: "" }],
    ["tenantCardId", { value: "" }], ["listPrice", { value: "" }], ["amount", { value: "" }]
  ]);
  const calls = [];
  const run = new Function(
    "$", "state", "renderEmployeeBedInfoStrips", "renderContext", "toast", "syncForm", "rentForBed", "fmtMoney", "apiFetch", "num",
    `${blocks}; lookupBed(); return true;`
  )(
    id => fields.get(id) || { value: "" },
    { lockCards: [], current: null, depositBalance: null, depositContext: null },
    () => {}, () => {}, () => {}, () => {}, () => 0, value => String(value),
    async url => { calls.push(url); return { ok: true, json: async () => ({ data: { success: true, deposit_recorded_amount: null } }) }; },
    value => Number(value || 0)
  );
  assert.equal(run, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ["/api/employee/deposit?bed=144&allow_live_fetch=0"]);
  assert.equal(calls.some(url => url.includes("/bed-context") || url.includes("/lock/cards") || url.includes("api.sciener.com")), false);
});

test("validate and write handlers explicitly disable live TTLock for all exit events", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validate = functionBlock(worker, "handleEmployeeEntryValidate");
  const write = functionBlock(worker, "handleEmployeeEntry");
  assert.match(validate, /aggregateTypes\.some\(type=>\["DR","CO"\]\.includes\(type\)\)/);
  assert.match(validate, /\["DR","CO"\]\.includes\(singleType\)/);
  assert.match(validate, /request_context\.allow_live_fetch=false/);
  assert.match(write, /\["DR","CO"\]\.includes\(employeeEntryUploadType/);
  assert.match(write, /request_context\.allow_live_fetch=false/);
  assert.match(worker, /context\.allow_live_fetch===false\)return false/);
  assert.match(worker, /EXIT_EVENT_ACCESS_CONTEXT_REFERENCE_ONLY/);
});

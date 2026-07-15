import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const worker = await readFile("deploy-worker/src/index.js", "utf8");
const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");

function functionBlock(source, name, last = false) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, "g");
  const starts = Array.from(source.matchAll(pattern), match => match.index);
  const start = last ? starts.at(-1) ?? -1 : starts[0] ?? -1;
  assert.notEqual(start, -1, `${name} must exist`);
  const marker = `__name(${name},`;
  const namedEnd = source.indexOf(marker, start);
  if (namedEnd > start) return source.slice(start, namedEnd);
  let depth = 0;
  let body = false;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") { depth += 1; body = true; }
    if (source[index] === "}" && body && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} must close`);
}

test("seven event UI and Worker contract matrix has one isolated validator per event", () => {
  const templates = employee.slice(employee.indexOf("const entryTemplates="), employee.indexOf("const employeeEntryTemplates="));
  const dispatch = functionBlock(worker, "validateEmployeeEntryUploadEventFields");
  const matrix = {
    rent: ["R", "validateRentUploadFields"],
    arrears_payment: ["AP", "validateArrearsPaymentUploadFields"],
    deposit_in: ["D", "validateDepositInUploadFields"],
    deposit_out: ["DR", "validateDepositOutUploadFields"],
    checkout: ["CO", "validateCheckoutUploadFields"],
    expense: ["E", "validateExpenseUploadFields"],
    bed_transfer: ["TF", "validateBedTransferUploadFields"]
  };
  for (const [event, [code, validator]] of Object.entries(matrix)) {
    assert.match(templates, new RegExp(`${event}:\\{[\\s\\S]*?code:'${code}'`));
    assert.match(dispatch, new RegExp(`${code}:${validator}`));
  }
  assert.match(dispatch, /UNKNOWN_EVENT_TYPE/);
  assert.doesNotMatch(dispatch, /validateRentUploadFields\s*\)|\|validateRentUploadFields/);
});

test("Expense 99, 100, and 500 AED pass without evidence while description remains required", () => {
  const context = {
    cleanText: value => String(value ?? "").trim(),
    employeeEntryUploadAmount: value => Number(value || 0),
    entryAnchorPaymentMethod: value => ({ C: "cash", B: "bank" }[value] || String(value || "").toLowerCase()),
    employeeEntryUploadHasValue: value => String(value ?? "").trim() !== "",
    employeeEntryValidationFailure: (stage, error_code, message, extra) => ({ ok: false, stage, error_code, message, ...extra })
  };
  vm.createContext(context);
  vm.runInContext(`${functionBlock(worker, "validateExpenseUploadFields")};this.validate=validateExpenseUploadFields`, context);
  for (const amount of [99, 100, 500]) {
    const entry = { target_bed: "219", amount, payment_method: "cash", expense_desc: "repair air conditioner" };
    assert.equal(context.validate(entry, entry, 0, { id: `expense-${amount}` }), null);
  }
  assert.equal(context.validate({ target_bed: "219", amount: 100, payment_method: "bank", expense_desc: "repair" }, {}, 0, {}), null);
  const missing = context.validate({ target_bed: "219", amount: 100, payment_method: "cash" }, {}, 0, {});
  assert.equal(missing.error_code, "EXPENSE_REQUIRED_FIELD_MISSING");
  assert.deepEqual(Array.from(missing.missing_fields), ["expense_description"]);
  const invalid = context.validate({ target_bed: "219", amount: 100, payment_method: "card", expense_desc: "repair" }, {}, 0, {});
  assert.deepEqual(Array.from(invalid.invalid_fields), ["payment_method"]);
});

test("13-record aggregate preflight returns every result with one shared request context and zero writes", async () => {
  const contexts = new Set();
  const sandbox = {
    cleanText: value => String(value ?? "").trim(),
    employeeEntryValidationEntryFromBody: body => body.entry || {},
    employeeEntryUploadType: entry => entry.type || "",
    entryAnchorEventType: type => ({ R: "rent", AP: "arrears_payment", D: "deposit_in", DR: "deposit_out", CO: "checkout", E: "expense", TF: "bed_transfer" }[type] || String(type || "entry").toLowerCase()),
    employeeBedTransferLegacyGenesisGate: () => ({ server_verified_permission: true }),
    cloudArrearsFetchActiveSessionRows: async (_env, _user, opts) => {
      opts.request_context.archive_read_count += 1;
      return [];
    },
    extractEmployeeEntryAnchorsFromSession: () => [],
    employeeEntryValidationFailure: (stage, error_code, message, extra = {}) => ({ ok: false, stage, error_code, message, missing_fields: extra.missing_fields || [], invalid_fields: extra.invalid_fields || [], event_index: extra.event_index || 0, event_type: extra.event_type || "", record_id: extra.record_id || null }),
    validateEmployeeEntryUploadPayload: async (_env, _user, body, opts) => {
      contexts.add(opts.request_context);
      if (body.entry.type === "TF") opts.request_context.ttlock_snapshot_count ||= 1;
      if (body.entry.fail) return { ok: false, stage: "fixture_validation", error_code: body.entry.error_code, message: "fixture failure", missing_fields: [], invalid_fields: [], event_index: opts.event_index, event_type: sandbox.entryAnchorEventType(body.entry.type), record_id: body.entry.id };
      return { ok: true, stage: "final_preflight", error_code: "", message: "passed", message_en: "passed", missing_fields: [], invalid_fields: [], event_index: opts.event_index, event_type: sandbox.entryAnchorEventType(body.entry.type), record_id: body.entry.id };
    }
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(worker, "employeeEntryAggregateValidationRequests"),
    functionBlock(worker, "employeeEntryAggregateResultIdentity"),
    functionBlock(worker, "employeeEntryAggregateRequestMetrics"),
    functionBlock(worker, "validateEmployeeEntryAggregatePreflight")
  ].join("\n"), sandbox);
  const types = ["TF", "D", "AP", "E", "CO", "DR", "R", "R", "D", "AP", "E", "CO", "R"];
  const validation_requests = types.map((type, index) => ({ entry: { id: `entry-${index + 1}`, type, room: "111", ...(index === 3 ? { fail: true, error_code: "EXPENSE_REQUIRED_FIELD_MISSING" } : {}), ...(index === 9 ? { fail: true, error_code: "ARREARS_REF_STALE_REFRESH_REQUIRED" } : {}) }, session: { id: "session-13", entries: [] } }));
  const context = { archive_read_count: 0, archive_parse_count: 0, ttlock_snapshot_count: 0 };
  const result = await sandbox.validateEmployeeEntryAggregatePreflight({}, { role: "staff" }, { validation_requests }, { request_context: context });
  assert.equal(result.validation_result_count, 13);
  assert.equal(result.failed_result_count, 2);
  assert.equal(result.passed_result_count, 11);
  assert.equal(result.formal_write_count, 0);
  assert.equal(result.write_attempted, false);
  assert.equal(contexts.size, 1);
  assert.equal(context.archive_read_count, 1);
  assert.equal(context.archive_parse_count, 1);
  assert.equal(context.ttlock_snapshot_count, 1);
  assert.deepEqual(Array.from(result.validation_results, row => row.event_index), Array.from({ length: 13 }, (_, index) => index));
  assert.deepEqual(Array.from(result.validation_results, row => row.entry_identity), Array.from({ length: 13 }, (_, index) => `entry-${index + 1}`));
});

test("Employee sends one aggregate validation request, binds every card by stable identity, and gates all writes", () => {
  const aggregate = functionBlock(employee, "validateEmployeeUploadAggregateDryRun");
  const upload = functionBlock(employee, "commitSessionAndExport", true);
  assert.equal((aggregate.match(/apiFetch\('\/api\/employee\/entry\/validate'/g) || []).length, 1);
  assert.match(aggregate, /aggregate_preflight:true/);
  assert.match(upload, /validationRequests\.push\(requestPayload\)/);
  assert.match(upload, /aggregatePreflight\?\.transport_failure===true/);
  assert.match(upload, /aggregatePreflight\?\.validation_results/);
  assert.match(upload, /aggregateResults\.find\(result=>String\(result\?\.entry_identity/);
  assert.match(upload, /uploadList\.forEach\(validated=>/);
  assert.match(upload, /employeeEntryStableIdentity\(row\)===employeeEntryStableIdentity\(validated\)/);
  const aggregateCall = upload.indexOf("validateEmployeeUploadAggregateDryRun(validationRequests)");
  const failedGate = upload.indexOf("if(dryRunFailed.length)", aggregateCall);
  const formalWrite = upload.indexOf("apiFetch('/api/employee/entry'", failedGate);
  assert.ok(aggregateCall >= 0 && failedGate > aggregateCall && formalWrite > failedGate);
  assert.doesNotMatch(upload.slice(aggregateCall, failedGate), /break;/);
});

test("aggregate errors stay bounded and 067 archive/TTLock reuse remains intact", () => {
  const fallback = functionBlock(employee, "employeeAggregateValidationSessionFailure");
  const canonical = functionBlock(worker, "validateEmployeeBedTransferCanonicalLink");
  const snapshot = functionBlock(worker, "getCanonicalTTLockSnapshot");
  assert.match(fallback, /transport_failure:true/);
  assert.match(fallback, /validation_results:\[\]/);
  assert.match(fallback, /failed_result_count:0/);
  assert.match(fallback, /Server validation unavailable\. Please retry\./);
  assert.doesNotMatch(fallback, /validationRequests|\.map\(/);
  assert.doesNotMatch(fallback, /raw_body|Cloudflare|<!DOCTYPE|<html/i);
  assert.match(canonical, /archive_entries_prepared!==true/);
  assert.match(canonical, /archive_parse_count=Number\(requestContext\.archive_parse_count\|\|0\)\+1/);
  assert.equal((canonical.match(/cloudArrearsFetchActiveSessionRows/g) || []).length, 1);
  assert.match(snapshot, /if\(context\.ttlockSnapshotPromise\)/);
  assert.match(snapshot, /ttlock_snapshot_count=Number\(context\.ttlock_snapshot_count\|\|0\)\+1/);
  assert.match(functionBlock(worker, "employeeExitEventReference"), /request_context:opts\.request_context/);
  assert.match(functionBlock(worker, "empFindProjectionArrearsForPayment"), /request_context:opts\.request_context/);
  assert.match(functionBlock(worker, "getOpenCloudArrearsForBed"), /request_context:opts\.request_context/);
  const arrearsGateway = functionBlock(worker, "canonicalArrearsGateway");
  assert.match(arrearsGateway, /requestContext\?await cloudArrearsFetchActiveSessionRows/);
  assert.match(arrearsGateway, /canonicalArrearsProjectionPromise/);
});

test("Expense finance remains Cash/Bank outflow only and Owner projections stay unchanged", () => {
  const finance = functionBlock(worker, "canonicalFinanceProjectionApplyAnchor");
  const expense = finance.slice(finance.indexOf('type==="expense"'), finance.indexOf('type==="bed_transfer"'));
  assert.match(expense, /canonicalFinanceProjectionAddOutflow\(totals,method,amount\)/);
  assert.match(expense, /totals\.expenses\+=amount/);
  assert.doesNotMatch(expense, /rent_income|deposit_received|arrears_repaid/);
  assert.match(worker, /function canonicalOwnerHistorySessionRow/);
});

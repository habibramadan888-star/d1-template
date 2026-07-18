import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const ownerPath = new URL("../deploy-worker/public/index-51-main.js", import.meta.url);
const employeePath = new URL("../deploy-worker/public/employee-v3.html", import.meta.url);

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const marker = source.indexOf(`__name(${name},`, start);
  if (marker > start) return source.slice(start, marker);
  let depth = 0;
  let opened = false;
  for (let index = source.indexOf("{", start); index < source.length; index += 1) {
    if (source[index] === "{") { depth += 1; opened = true; }
    if (source[index] === "}") depth -= 1;
    if (opened && depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} block is incomplete`);
}

async function workerRuntime() {
  const source = await readFile(workerPath, "utf8");
  const sandbox = {
    JSON, Math, Number, Object, Set, String,
    cleanId: value => String(value ?? "").trim(),
    cleanText: (value, max = 1000) => String(value ?? "").trim().slice(0, max),
    ownerOverviewMoney: value => Math.round((Number(value) || 0) * 100) / 100,
    qaAcceptanceEnabled: env => String(env?.QA_ACCEPTANCE_ENABLED || "").toLowerCase() === "true",
    entryAnchorType: row => String(row?.type || "").toUpperCase(),
    entryAnchorEventType: type => ({ R: "rent" })[String(type || "").toUpperCase()] || String(type || "").toLowerCase(),
  };
  vm.createContext(sandbox);
  vm.runInContext('const RENT_ENTRY_V2_CONTRACT="rent_entry_v2"; const RENT_ENTRY_V2_LEG_METHOD_ORDER={bank:0,cash:1};', sandbox);
  for (const name of [
    "entryAnchorPaymentMethod", "entryAnchorMoney", "rentSplitPaymentV2Enabled", "rentEntryV2Requested",
    "rentEntryParentIdentity", "rentEntryLegIdentity", "normalizeRentEntryPaymentLegs",
    "canonicalFinanceProjectionZeroTotals", "canonicalFinanceProjectionRoundTotals", "canonicalFinanceProjectionPaymentMethod",
    "canonicalFinanceProjectionAmount", "canonicalFinanceProjectionEventType", "canonicalFinanceProjectionAddInflow",
    "canonicalFinanceProjectionAddOutflow", "canonicalFinanceProjectionApplyAnchor", "ownerEmployeeDetailRowsTotals",
  ]) vm.runInContext(functionBlock(source, name), sandbox);
  return { source, sandbox };
}

function mixedRent(overrides = {}) {
  const id = overrides.id || "QA-RENT-MIXED-E01";
  return {
    id, event_id: id, type: "R", event_type: "rent", room: "7210", bed: "7210",
    amount: 730, due: 730, expected_rent: 730, paid: 730, paid_amount: 730,
    contract_version: "rent_entry_v2", anchor_contract_version: "rent_entry_v2",
    payment_method: "mixed", pay_type: "M", cat: "mixed",
    payment_legs: [
      { leg_id: `${id}-CASH`, parent_entry_id: id, method: "cash", amount_aed: 700 },
      { leg_id: `${id}-BANK`, parent_entry_id: id, method: "bank", amount_aed: 30 },
    ],
    ...overrides,
  };
}

test("QA-only gate is open only when both acceptance and Rent split gates are explicit", async () => {
  const { sandbox } = await workerRuntime();
  assert.equal(sandbox.rentSplitPaymentV2Enabled({ QA_ACCEPTANCE_ENABLED: "true", RENT_SPLIT_PAYMENT_V2_ENABLED: "true" }), true);
  assert.equal(sandbox.rentSplitPaymentV2Enabled({ APP_ENV: "internal_beta", RENT_SPLIT_PAYMENT_V2_ENABLED: "true" }), false);
  assert.equal(sandbox.rentSplitPaymentV2Enabled({ QA_ACCEPTANCE_ENABLED: "true" }), false);
});

test("Mixed Full normalizes to one parent, two stable legs, and canonical ordering", async () => {
  const { sandbox } = await workerRuntime();
  const first = sandbox.normalizeRentEntryPaymentLegs(mixedRent());
  const reordered = sandbox.normalizeRentEntryPaymentLegs(mixedRent({ payment_legs: [...mixedRent().payment_legs].reverse() }));
  assert.equal(first.ok, true);
  assert.equal(first.parent_entry_id, "QA-RENT-MIXED-E01");
  assert.equal(first.total, 730);
  assert.deepEqual(JSON.parse(JSON.stringify(first.legs)), [
    { leg_id: "QA-RENT-MIXED-E01-BANK", parent_entry_id: "QA-RENT-MIXED-E01", method: "bank", amount_aed: 30 },
    { leg_id: "QA-RENT-MIXED-E01-CASH", parent_entry_id: "QA-RENT-MIXED-E01", method: "cash", amount_aed: 700 },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(reordered.legs)), JSON.parse(JSON.stringify(first.legs)));
});

test("Mixed Full Finance and Owner Detail allocate channels without double counting parent paid", async () => {
  const { sandbox } = await workerRuntime();
  const row = mixedRent();
  const totals = sandbox.canonicalFinanceProjectionZeroTotals();
  sandbox.canonicalFinanceProjectionApplyAnchor(totals, row);
  const rounded = sandbox.canonicalFinanceProjectionRoundTotals(totals);
  assert.equal(rounded.cash_received, 700);
  assert.equal(rounded.bank_received, 30);
  assert.equal(rounded.gross_received, 730);
  assert.equal(rounded.rent_income, 730);
  assert.notEqual(rounded.gross_received, 1460, "parent and legs must never both enter total received");
  assert.equal(rounded.arrears_opened_amount, 0);
  const detail = sandbox.ownerEmployeeDetailRowsTotals([row]);
  assert.deepEqual(JSON.parse(JSON.stringify(detail)), { cash: 700, bank: 30, expense: 0, refund: 0, gross: 730 });
});

test("Mixed Short and Mixed Excess preserve existing parent Rent semantics", async () => {
  const { sandbox } = await workerRuntime();
  const short = mixedRent({ id: "QA-SHORT", event_id: "QA-SHORT", room: "7211", bed: "7211", amount: 700, due: 770, expected_rent: 770, paid: 700, paid_amount: 700, arrears_amount: 70, short_paid: true, payment_legs: [
    { leg_id: "QA-SHORT-CASH", parent_entry_id: "QA-SHORT", method: "cash", amount_aed: 670 },
    { leg_id: "QA-SHORT-BANK", parent_entry_id: "QA-SHORT", method: "bank", amount_aed: 30 },
  ] });
  const shortTotals = sandbox.canonicalFinanceProjectionZeroTotals();
  sandbox.canonicalFinanceProjectionApplyAnchor(shortTotals, short);
  assert.equal(shortTotals.cash_received, 670);
  assert.equal(shortTotals.bank_received, 30);
  assert.equal(shortTotals.rent_income, 700);
  assert.equal(shortTotals.arrears_opened_amount, 70);

  const excess = mixedRent({ id: "QA-EXCESS", event_id: "QA-EXCESS", room: "7212", bed: "7212", due: 700, expected_rent: 700, payment_legs: [
    { leg_id: "QA-EXCESS-CASH", parent_entry_id: "QA-EXCESS", method: "cash", amount_aed: 700 },
    { leg_id: "QA-EXCESS-BANK", parent_entry_id: "QA-EXCESS", method: "bank", amount_aed: 30 },
  ] });
  const excessTotals = sandbox.canonicalFinanceProjectionZeroTotals();
  sandbox.canonicalFinanceProjectionApplyAnchor(excessTotals, excess);
  assert.equal(excessTotals.gross_received, 730);
  assert.equal(excessTotals.rent_income, 730);
  assert.equal(excessTotals.arrears_opened_amount, 0);
});

test("invalid legs fail closed with precise stable error codes", async () => {
  const { sandbox } = await workerRuntime();
  const cases = [
    [mixedRent({ paid: 731, paid_amount: 731 }), "RENT_SPLIT_LEG_SUM_MISMATCH"],
    [mixedRent({ payment_legs: [mixedRent().payment_legs[0]] }), "RENT_SPLIT_LEG_COUNT_INVALID"],
    [mixedRent({ payment_legs: [mixedRent().payment_legs[0], { ...mixedRent().payment_legs[1], method: "cash", leg_id: "QA-RENT-MIXED-E01-CASH" }] }), "RENT_SPLIT_DUPLICATE_METHOD"],
    [mixedRent({ payment_legs: [{ ...mixedRent().payment_legs[0], amount_aed: -1 }, mixedRent().payment_legs[1]] }), "RENT_SPLIT_LEG_AMOUNT_INVALID"],
    [mixedRent({ payment_legs: [{ ...mixedRent().payment_legs[0], amount_aed: "700" }, mixedRent().payment_legs[1]] }), "RENT_SPLIT_LEG_AMOUNT_INVALID"],
    [mixedRent({ payment_legs: [{ ...mixedRent().payment_legs[0], amount_aed: 700.001 }, mixedRent().payment_legs[1]] }), "RENT_SPLIT_LEG_AMOUNT_INVALID"],
    [mixedRent({ payment_legs: [{ ...mixedRent().payment_legs[0], parent_entry_id: "OTHER" }, mixedRent().payment_legs[1]] }), "RENT_SPLIT_PARENT_ENTRY_ID_MISMATCH"],
    [mixedRent({ payment_legs: [{ ...mixedRent().payment_legs[0], provider: "forbidden" }, mixedRent().payment_legs[1]] }), "RENT_SPLIT_LEG_FIELD_NOT_ALLOWED"],
  ];
  for (const [entry, error] of cases) assert.equal(sandbox.normalizeRentEntryPaymentLegs(entry).error_code, error);
});

test("legacy single-channel Rent exposes a virtual leg without mutating persisted data", async () => {
  const { sandbox } = await workerRuntime();
  const legacy = { id: "LEGACY-E1", type: "R", event_type: "rent", paid_amount: 680, payment_method: "bank" };
  const before = JSON.stringify(legacy);
  const normalized = sandbox.normalizeRentEntryPaymentLegs(legacy);
  assert.equal(normalized.requested, false);
  assert.deepEqual(JSON.parse(JSON.stringify(normalized.legs)), [{ leg_id: "LEGACY-E1-BANK", parent_entry_id: "LEGACY-E1", method: "bank", amount_aed: 680, virtual: true }]);
  assert.equal(JSON.stringify(legacy), before);
});

test("runtime fingerprint source binds canonical payment legs and one aggregate transaction remains the storage contract", async () => {
  const { source } = await workerRuntime();
  assert.match(source, /split\.legs\.map\(leg=>\[leg\.leg_id,leg\.parent_entry_id,leg\.method,employeeEntryFingerprintMoney\(leg\.amount_aed\)\]\.join\("\^"\)\)/);
  assert.match(source, /cat:cleanText\(rentSplit\?\.requested\?"mixed"/);
  assert.match(source, /pay_type:cleanText\(rentSplit\?\.requested\?"M"/);
  assert.match(source, /entries_count:sessionAnchorEntries\.length\|\|1/);
});

test("Owner Period totals read channel legs but retain one parent business row", async () => {
  const source = await readFile(ownerPath, "utf8");
  const sandbox = { Math, Number, Set, String };
  vm.createContext(sandbox);
  for (const name of ["ownerRentPaymentLegs", "ownerEntryChannelAmounts", "totals"]) vm.runInContext(functionBlock(source, name), sandbox);
  const row = mixedRent();
  const totals = sandbox.totals([row]);
  assert.equal(totals.cashIn, 700);
  assert.equal(totals.bankIn, 30);
  assert.equal(totals.total, 730);
  assert.equal([row].length, 1);
});

test("Employee exposes Cash plus Bank only behind the QA capability and preserves one card contract", async () => {
  const html = await readFile(employeePath, "utf8");
  assert.match(html, /data-pay="M"/);
  assert.match(html, /id="rentCashAmount"/);
  assert.match(html, /id="rentBankAmount"/);
  assert.match(html, /rent_split_payment_v2_enabled/);
  assert.match(html, /employeeRentSplitPaymentV2Enabled\(\)/);
  assert.match(html, /const detail=\[eventLabel\(e\.type\),employeePaymentMethodDisplay\(e\)\]/);
  assert.match(html, /rows\.map\(\(e,i\)=>\{/);
});

test("Employee shared Ledger renders one mixed Rent and exact Cash Bank Total values", async () => {
  const entry = mixedRent({ created_at: "2026-07-18T10:00:00.000Z", period_start: "2026-07-18", period_end: "2026-08-18" });
  const ledger = await buildWhatsappTextWithDrafts([entry]);
  assert.match(ledger, /\[7210\] paid 730 cash 700 \+ bank 30/);
  assert.match(ledger, /Cash Received[^\n]*700/);
  assert.match(ledger, /Bank Received[^\n]*30/);
  assert.match(ledger, /Total Received[^\n]*730/);
  assert.match(ledger, /Cash \+ Bank Rent Details/);
  assert.equal((ledger.match(/\[7210\] paid 730/g) || []).length, 1);
});

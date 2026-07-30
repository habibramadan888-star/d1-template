import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const employeeSource = await readFile(
  new URL("../deploy-worker/public/employee-v3.html", import.meta.url),
  "utf8"
);

function functionBlock(name, nextName) {
  const start = employeeSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = nextName ? employeeSource.indexOf(`function ${nextName}(`, start) : -1;
  assert.notEqual(end, -1, `${nextName} must follow ${name}`);
  return employeeSource.slice(start, end);
}

const paidHelperSource = functionBlock(
  "employeeRentPaidAmount",
  "employeeBaseEntryPayload"
);
const employeeRentPaidAmount = Function(
  `${paidHelperSource}; return employeeRentPaidAmount;`
)();

test("Rent paid preserves the actual amount above, at, and below due", () => {
  assert.equal(employeeRentPaidAmount(700, ""), 700);
  assert.equal(employeeRentPaidAmount(715, ""), 715);
  assert.equal(employeeRentPaidAmount(880, ""), 880);
  assert.equal(employeeRentPaidAmount(770, ""), 770);
  assert.equal(employeeRentPaidAmount(500, ""), 500);
  assert.equal(employeeRentPaidAmount(650, ""), 650);
});

test("Rent paid preserves explicit finite non-negative values including zero", () => {
  assert.equal(employeeRentPaidAmount(700, "0"), 0);
  assert.equal(employeeRentPaidAmount(700, "525.50"), 525.5);
  assert.equal(employeeRentPaidAmount(0, ""), 0);
  assert.equal(employeeRentPaidAmount(700, "invalid"), 700);
  assert.equal(employeeRentPaidAmount(700, "-1"), 700);
});

test("all Rent construction paths use the shared paid helper without due capping", () => {
  const base = functionBlock("employeeBaseEntryPayload", "employeeValidationResult");
  const rent = functionBlock("buildRentAnchor", "buildArrearsPaymentAnchor");
  const sync = functionBlock("syncForm", "validateDeprecatedGenericEntryValidation");
  const anchors = functionBlock("applyEntryAnchors", "normalizeEntryAnchor");

  assert.match(base, /type==='R'\s*\?employeeRentPaidAmount\(amount,employeeFieldValue\('paid'\)\)/);
  assert.match(rent, /const paid=employeeRentPaidAmount\(amount,employeeFieldValue\('paid'\)\);/);
  assert.doesNotMatch(rent, /Math\.min\(amount,due\|\|amount\)/);
  assert.match(sync, /else if\(type==='R'\)\$\('paid'\)\.value=fmtMoney\(employeeRentPaidAmount\(amt,amt\)\);/);
  assert.doesNotMatch(sync, /\['R','TFF'\]\.includes\(type\).*Math\.min\(amt,due\|\|amt\)/);
  assert.match(sync, /else if\(type==='TFF'\)\$\('paid'\)\.value=fmtMoney\(Math\.min\(amt,due\|\|amt\)\);/);
  assert.match(anchors, /const rentPaid=type==='R'\?employeeRentPaidAmount\(e\.amount,e\.paid\):0;/);
  assert.match(anchors, /paid_amount:rentPaid/);
  assert.doesNotMatch(anchors, /paid_amount:num\(e\.paid\|\|e\.amount\)/);
});

test("due still drives Rent difference and warning fields", () => {
  const rent = functionBlock("buildRentAnchor", "buildArrearsPaymentAnchor");
  assert.match(rent, /const tail=Math\.max\(0,due-paid\);/);
  assert.match(rent, /deficit:tail/);
  assert.match(rent, /excess:Math\.max\(0,amount-due\)/);
  assert.match(rent, /reason_code:tail>0\?'SHORT_PAID'/);
});

test("a deposit note does not create a Deposit In event or alter Rent paid", () => {
  const rent = functionBlock("buildRentAnchor", "buildArrearsPaymentAnchor");
  assert.equal(employeeRentPaidAmount(880, ""), 880);
  assert.doesNotMatch(rent, /buildDepositInAnchor|type:'D'|event_type:'deposit_in'/);
});

test("summary compatibility remains paid_amount then paid then amount", () => {
  const received = functionBlock(
    "employeeSessionReceivedAmount",
    "employeeSessionExpenseAmount"
  );
  assert.match(
    received,
    /if\(type==='R'\)return employeeSessionValue\(entry,\['paid_amount','paid','amount'\]\);/
  );
});

test("the fix does not add existing-draft migration or browser storage rewrites", () => {
  const helperAndBase = functionBlock(
    "employeeRentPaidAmount",
    "employeeValidationResult"
  );
  assert.doesNotMatch(
    helperAndBase,
    /localStorage|sessionStorage|state\.drafts|saveDrafts|migration/i
  );
});

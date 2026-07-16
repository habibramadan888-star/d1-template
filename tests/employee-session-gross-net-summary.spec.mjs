import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS } from "./fixtures/employee-seven-event-golden-session.mjs";
import { GOLDEN_FINANCE_EXPECTED } from "./helpers/employee-golden-session-oracle.mjs";

const employeePath = "deploy-worker/public/employee-v3.html";

async function summaryCalculator() {
  const source = await readFile(employeePath, "utf8");
  const start = source.indexOf("function employeeSessionValue");
  const end = source.indexOf("function renderSessionKpisLegacy", start);
  assert.ok(start >= 0 && end > start, "shared session calculation block must exist");
  const sandbox = {
    state: { drafts: [] },
    num: (value) => Number(String(value ?? "").replace(/,/g, "")) || 0
  };
  vm.createContext(sandbox);
  vm.runInContext(`${source.slice(start, end)}\nresult = calculateEmployeeSessionSummary;`, sandbox);
  return sandbox.result;
}

test("historical APT-20260711-Q2R0A1 uses paid cash, bank, and actual expenses exactly once", async () => {
  const calculate = await summaryCalculator();
  const rows = [
    { id: "rent-cash", type: "R", pay_type: "C", due: 9481, paid: 9481 },
    { id: "arrears-bank", type: "AP", pay_type: "B", payment_amount: 4850 },
    ...[500, 170, 26, 7].map((amount, index) => ({ id: `expense-${index}`, type: "E", pay_type: "C", expense_amount: amount })),
    { id: "summary-row", type: "SUMMARY", pay_type: "C", amount: 999999, is_summary: true }
  ];
  const summary = calculate(rows);
  assert.deepEqual(
    {
      cashReceived: summary.cashReceived,
      bankReceived: summary.bankReceived,
      totalReceived: summary.totalReceived,
      totalExpenses: summary.totalExpenses,
      netFunds: summary.netFunds,
      cashNet: summary.cashNet,
      bankNet: summary.bankNet
    },
    { cashReceived: 9481, bankReceived: 4850, totalReceived: 14331, totalExpenses: 703, netFunds: 13628, cashNet: 8778, bankNet: 4850 }
  );
});

test("five-entry quick summary fixture shows cash net 720 and bank received 700", async () => {
  const calculate = await summaryCalculator();
  const rows = [
    { type: "R", pay_type: "C", due: 970, paid: 970 },
    { type: "R", pay_type: "B", due: 700, paid: 700 },
    { type: "E", pay_type: "C", expense_amount: 250 },
    { type: "CO", amount: 0 },
    { type: "TF", fee_mode: "waived", fee_amount_aed: 0 }
  ];
  const summary = calculate(rows);
  assert.equal(rows.length, 5);
  assert.equal(summary.cashNet, 720);
  assert.equal(summary.bankReceived, 700);
});

test("received, outstanding, deposit, arrears, expense, and waived rules remain separate", async () => {
  const calculate = await summaryCalculator();
  const shortPaid = calculate([{ type: "R", pay_type: "C", due: 700, paid: 500 }]);
  assert.equal(shortPaid.totalReceived, 500);
  assert.equal(shortPaid.outstanding, 200);

  const arrearsCreated = calculate([{ type: "CO", pay_type: "C", arrears_amount: 200 }]);
  assert.equal(arrearsCreated.totalReceived, 0);

  const arrearsPaid = calculate([{ type: "AP", pay_type: "B", payment_amount: 200 }]);
  assert.equal(arrearsPaid.totalReceived, 200);
  assert.equal(arrearsPaid.arrearsIn, 200);

  const deposit = calculate([{ type: "D", pay_type: "C", deposit_amount: 200, deposit_paid_amount: 200 }]);
  assert.equal(deposit.totalReceived, 200);
  assert.equal(deposit.depositIncluded, 200);
  assert.equal(deposit.rentIn, 0);

  const cashExpense = calculate([{ type: "E", pay_type: "C", expense_amount: 100 }]);
  assert.equal(cashExpense.totalExpenses, 100);
  assert.equal(cashExpense.cashNet, -100);
  assert.equal(cashExpense.totalReceived, 0);

  const bankExpense = calculate([{ type: "E", pay_type: "B", expense_amount: 100 }]);
  assert.equal(bankExpense.totalExpenses, 100);
  assert.equal(bankExpense.bankNet, -100);

  const waived = calculate([{ type: "TF", payment_method: "cash", fee_mode: "waived", fee_amount_aed: 50 }]);
  assert.equal(waived.totalReceived, 0);
});

test("Current Session, Preview, and WhatsApp export share the one calculation", async () => {
  const source = await readFile(employeePath, "utf8");
  const kpis = source.slice(source.lastIndexOf("function renderSessionKpis"), source.indexOf("function applyBilingualUI", source.lastIndexOf("function renderSessionKpis")));
  const preview = source.slice(source.lastIndexOf("previewSession=function"), source.indexOf("function closePreviewModal", source.lastIndexOf("previewSession=function")));
  const ledger = source.slice(source.lastIndexOf("function buildEntrySessionLedgerText"), source.indexOf("function previewField", source.lastIndexOf("function buildEntrySessionLedgerText")));
  assert.match(kpis, /calculateEmployeeSessionSummary\(state\.drafts\)/);
  assert.match(preview, /buildEntrySessionLedgerText\(\)/);
  assert.match(preview, /data-session-ledger-preview/);
  assert.match(ledger, /calculateEmployeeSessionSummary\(rows\)/);
  for (const label of ["Total Received", "Net Funds", "Cash Net", "Bank Net"]) {
    assert.match(kpis, new RegExp(label));
    assert.match(ledger, new RegExp(label));
  }
  assert.doesNotMatch(kpis, /Gross Received|Cash Balance|Total Income/);
});

test("short-paid rent exposes outstanding, arrears opened, and arrears repaid independently", async () => {
  const calculate = await summaryCalculator();
  const summary = calculate([
    { type: "R", pay_type: "C", due: 770, paid: 700 },
    { type: "R", pay_type: "B", due: 700, paid: 700 },
    { type: "E", pay_type: "C", expense_amount: 250 }
  ]);
  assert.equal(summary.cashReceived, 700);
  assert.equal(summary.bankReceived, 700);
  assert.equal(summary.totalReceived, 1400);
  assert.equal(summary.cashExpenses, 250);
  assert.equal(summary.cashNet, 450);
  assert.equal(summary.netFunds, 1150);
  assert.equal(summary.outstanding, 70);
  assert.equal(summary.arrearsOpened, 70);
  assert.equal(summary.arrearsRepaid, 0);
});

test("Quick 16 Ledger summary exactly matches the shared Finance oracle", async () => {
  const calculate = await summaryCalculator();
  const rows = EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS.map(row => structuredClone(row.input));
  const summary = calculate(rows);
  assert.deepEqual(
    {
      cash_received: summary.cashReceived,
      bank_received: summary.bankReceived,
      total_received: summary.totalReceived,
      cash_out: summary.cashExpenses,
      bank_out: summary.bankExpenses,
      total_expenses: summary.totalExpenses,
      net_funds: summary.netFunds,
      cash_net: summary.cashNet,
      bank_net: summary.bankNet,
      outstanding: summary.outstanding,
      arrears_opened: summary.arrearsOpened,
      arrears_repaid: summary.arrearsRepaid,
      deposit_included: summary.depositIncluded,
      deposit_refund: summary.depRefund,
      expense: summary.expenses,
      bed_transfer_fee: summary.transferFee,
      rent_income: summary.rentIn
    },
    GOLDEN_FINANCE_EXPECTED
  );
});

test("voided or ineffective arrears evidence never enters the shared Ledger totals", async () => {
  const calculate = await summaryCalculator();
  const summary = calculate([
    { type: "CO", event_type: "left_with_arrears", left_with_arrears: true, left_arrears_amount: 80 },
    { type: "CO", event_type: "left_with_arrears", left_with_arrears: true, left_arrears_amount: 900, effective: false },
    { type: "R", due: 900, paid: 0, status: "voided" }
  ]);
  assert.equal(summary.outstanding, 80);
  assert.equal(summary.arrearsOpened, 80);
});

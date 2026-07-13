import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

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
  const whatsapp = source.slice(source.lastIndexOf("function buildEntrySessionWhatsAppText"), source.indexOf("function previewField", source.lastIndexOf("function buildEntrySessionWhatsAppText")));
  assert.match(kpis, /calculateEmployeeSessionSummary\(state\.drafts\)/);
  assert.match(preview, /buildEntrySessionWhatsAppText\(\)/);
  assert.match(preview, /data-session-ledger-preview/);
  assert.match(whatsapp, /calculateEmployeeSessionSummary\(rows\)/);
  for (const label of ["Total Received", "Net Funds", "Cash Net", "Bank Net"]) {
    assert.match(kpis, new RegExp(label));
    assert.match(whatsapp, new RegExp(label));
  }
  assert.doesNotMatch(kpis, /Gross Received|Cash Balance|Total Income/);
});

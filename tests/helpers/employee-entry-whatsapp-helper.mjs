import { readFile } from "node:fs/promises";
import vm from "node:vm";

export const employeeHtmlPath = "deploy-worker/public/employee-v3.html";
export const ownerMainPath = "deploy-worker/public/index-51-main.js";

export async function readEmployeeHtml() {
  return readFile(employeeHtmlPath, "utf8");
}

export function extractFunctionBlock(source, startName, endName) {
  const start = source.indexOf(`function ${startName}`);
  const end = source.indexOf(`function ${endName}`, start);
  if (start < 0 || end < 0) {
    throw new Error(`Unable to extract ${startName}..${endName}`);
  }
  return source.slice(start, end);
}

export async function buildWhatsappTextWithDrafts(drafts) {
  const source = await readEmployeeHtml();
  const block = extractFunctionBlock(source, "entryWhatsappSafe", "previewField");
  const sandbox = {
    state: { drafts },
    num: (value) => Number(String(value || "").replace(/,/g, "")),
    fmtMoney: (value) =>
      (Number(value) || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    today: () => "2026-06-02",
    operatorName: () => "Abdul",
    operatorId: () => "abdul"
  };
  sandbox.sessionStats = () => {
    const rows = sandbox.state.drafts;
    const inDirection = (entry) => !["E", "DR"].includes(entry.type);
    const cashIn = rows
      .filter((entry) => (entry.pay_type === "C" || entry.payment_method === "cash") && inDirection(entry))
      .reduce((sum, entry) => sum + sandbox.num(entry.amount), 0);
    const bankIn = rows
      .filter((entry) => (entry.pay_type === "B" || entry.payment_method === "bank") && inDirection(entry))
      .reduce((sum, entry) => sum + sandbox.num(entry.amount), 0);
    const cashOut = rows
      .filter((entry) => (entry.pay_type === "C" || entry.payment_method === "cash") && !inDirection(entry))
      .reduce((sum, entry) => sum + sandbox.num(entry.amount), 0);
    return {
      rows,
      cashBalance: cashIn - cashOut,
      bankIn,
      grossReceived: cashIn + bankIn
    };
  };
  vm.createContext(sandbox);
  vm.runInContext(`${block}\nresult = buildEntrySessionWhatsAppText();`, sandbox);
  return sandbox.result;
}

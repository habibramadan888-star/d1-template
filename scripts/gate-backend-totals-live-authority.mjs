#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "BACKEND_TOTALS_SOURCE_OF_TRUTH.md",
  "BACKEND_TOTALS_AUTHORITY_REHEARSAL_RESULT.md",
  "BACKEND_TOTALS_AUTHORITY_GATE.md",
  "MONEY_RECONCILIATION_GATE_RESULT.md",
  "TOP_25_MONEY_RISKS.md",
  "RECEIVABLES_MODEL_DESIGN.md",
  "TENANCY_SCOPE_AUDIT.md"
];

function read(file) {
  const target = path.resolve(file);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
}

function has(file) {
  return fs.existsSync(path.resolve(file));
}

const rows = [];
for (const file of requiredFiles) {
  rows.push({
    gate: `required file ${file}`,
    result: has(file) ? "PASS" : "FAIL",
    evidence: has(file) ? file : "missing",
    notes: has(file) ? "available for gate review" : "required gate evidence missing"
  });
}

const rehearsal = read("BACKEND_TOTALS_AUTHORITY_REHEARSAL_RESULT.md");
rows.push({
  gate: "backend totals rehearsal evidence",
  result:
    rehearsal.includes("MISMATCH") && rehearsal.includes("LEGACY_WARNING") ? "PASS" : "WARNING",
  evidence: "BACKEND_TOTALS_AUTHORITY_REHEARSAL_RESULT.md",
  notes: "Tamper/void mismatches are expected rehearsal evidence, not live switch approval."
});

const moneyGate = read("MONEY_RECONCILIATION_GATE_RESULT.md");
const manualRequired = moneyGate.includes("MONEY_RECONCILIATION_OVERALL=MANUAL_REQUIRED");
rows.push({
  gate: "money reconciliation gate",
  result: manualRequired ? "MANUAL_REQUIRED" : "WARNING",
  evidence: "MONEY_RECONCILIATION_GATE_RESULT.md",
  notes: manualRequired
    ? "No FAIL/BLOCKED expected, but human reconciliation remains required before live authority."
    : "Review reconciliation output before proceeding."
});

rows.push({
  gate: "receivables dependency",
  result: "MANUAL_REQUIRED",
  evidence: "RECEIVABLES_MODEL_DESIGN.md",
  notes: "Arrears/outstanding totals cannot become final authority before P0-008."
});

rows.push({
  gate: "tenant/property dependency",
  result: "MANUAL_REQUIRED",
  evidence: "TENANCY_SCOPE_AUDIT.md",
  notes: "Shared SaaS totals require P0-006 tenant/property scope before production."
});

rows.push({
  gate: "live response modification",
  result: "PASS",
  evidence: "script is read-only",
  notes: "This gate does not modify API responses, dashboard output, formulas, or database rows."
});

const hasFail = rows.some((row) => row.result === "FAIL");
const hasManual = rows.some((row) => row.result === "MANUAL_REQUIRED");
const overall = hasFail ? "FAIL" : hasManual ? "MANUAL_REQUIRED" : "PASS";

const report = [
  "# Backend Totals Live Authority Gate Result",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `Overall: \`${overall}\``,
  "",
  "| Gate | Result | Evidence | Notes |",
  "| --- | --- | --- | --- |",
  ...rows.map((row) => `| ${row.gate} | ${row.result} | ${row.evidence} | ${row.notes} |`),
  "",
  "This is a dry-run gate only. It does not change live dashboard output or live financial formulas."
];

fs.writeFileSync(
  path.resolve("BACKEND_TOTALS_LIVE_AUTHORITY_GATE_RESULT.md"),
  `${report.join("\n")}\n`
);

console.log(`BACKEND_TOTALS_LIVE_AUTHORITY_GATE=${overall}`);
console.log("Wrote BACKEND_TOTALS_LIVE_AUTHORITY_GATE_RESULT.md");
process.exit(hasFail ? 1 : 0);

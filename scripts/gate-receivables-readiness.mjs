#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const checks = [
  ["model design", "RECEIVABLES_MODEL_DESIGN.md", "PASS"],
  ["lifecycle test plan", "RECEIVABLES_LIFECYCLE_TEST_PLAN.md", "PASS"],
  ["money migration review", "MONEY_DUAL_WRITE_MIGRATION_REVIEW.md", "PASS"],
  ["money reconciliation gate", "MONEY_RECONCILIATION_GATE.md", "PASS"],
  ["backend totals source", "BACKEND_TOTALS_SOURCE_OF_TRUTH.md", "PASS"],
  ["handover go-live gate", "HANDOVER_ATOMIC_GO_LIVE_GATE.md", "PASS"],
  ["receivables migration draft", "migration-drafts/receivables_model_draft.sql", "MANUAL_REQUIRED"]
];

const rows = checks.map(([check, file, defaultResult]) => {
  const exists = fs.existsSync(path.resolve(file));
  return {
    check,
    result: exists
      ? defaultResult
      : defaultResult === "MANUAL_REQUIRED"
        ? "MANUAL_REQUIRED"
        : "FAIL",
    evidence: exists ? file : `${file} missing`,
    notes: exists
      ? "available"
      : defaultResult === "MANUAL_REQUIRED"
        ? "draft required before local/staging implementation rehearsal"
        : "required input missing"
  };
});

rows.push({
  check: "production mutation",
  result: "PASS",
  evidence: "script is read-only",
  notes: "no production, remote, or local database mutation is executed"
});

rows.push({
  check: "production readiness",
  result: "MANUAL_REQUIRED",
  evidence: "P0-001/P0-003/P0-006 dependencies",
  notes:
    "production receivables remain blocked by money, totals, tenant scope, reconciliation, and human approval"
});

const fail = rows.some((row) => row.result === "FAIL");
const manual = rows.some((row) => row.result === "MANUAL_REQUIRED");
const overall = fail ? "FAIL" : manual ? "MANUAL_REQUIRED" : "PASS";

const report = [
  "# Receivables Readiness Gate Result",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `Overall: \`${overall}\``,
  "",
  "| Gate | Result | Evidence | Notes |",
  "| --- | --- | --- | --- |",
  ...rows.map((row) => `| ${row.check} | ${row.result} | ${row.evidence} | ${row.notes} |`),
  "",
  "This gate is read-only and does not execute migrations."
];

fs.writeFileSync(path.resolve("RECEIVABLES_READINESS_GATE_RESULT.md"), `${report.join("\n")}\n`);
console.log(`RECEIVABLES_READINESS_GATE=${overall}`);
console.log("Wrote RECEIVABLES_READINESS_GATE_RESULT.md");
process.exit(fail ? 1 : 0);

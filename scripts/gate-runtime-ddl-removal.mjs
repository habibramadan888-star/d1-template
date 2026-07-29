#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const required = [
  "RUNTIME_DDL_STATUS.md",
  "RUNTIME_DDL_MIGRATION_PLAN.md",
  "D1_MIGRATION_ORDER.md",
  "D1_BOOTSTRAP_AUDIT.md",
  "D1_MINIMUM_SCHEMA_PLAN.md",
  "RUNTIME_DDL_STATIC_SCAN.md"
];

const rows = required.map((file) => {
  const exists = fs.existsSync(path.resolve(file));
  return {
    gate: `required evidence ${file}`,
    result: exists ? "PASS" : "FAIL",
    evidence: exists ? file : "missing",
    notes: exists ? "available" : "required runtime DDL evidence missing"
  };
});

const scan = fs.existsSync(path.resolve("RUNTIME_DDL_STATIC_SCAN.md"))
  ? fs.readFileSync(path.resolve("RUNTIME_DDL_STATIC_SCAN.md"), "utf8")
  : "";
const findingRows = scan
  .split(/\r?\n/)
  .filter((line) => line.startsWith("| `") || line.startsWith("| deploy-worker"));

rows.push({
  gate: "runtime DDL findings",
  result: findingRows.length > 0 ? "MANUAL_REQUIRED" : "PASS",
  evidence: `${findingRows.length} static scan table rows`,
  notes:
    findingRows.length > 0
      ? "runtime DDL still exists and must not be removed without staging migration proof"
      : "no static scan findings detected"
});

rows.push({
  gate: "production migration readiness",
  result: "MANUAL_REQUIRED",
  evidence: "production backup/staging migration not approved",
  notes:
    "runtime DDL removal from production requires human-approved migration, backup, rollback, and drift checks"
});

rows.push({
  gate: "mutation safety",
  result: "PASS",
  evidence: "script is read-only",
  notes: "no DDL was removed or executed"
});

const fail = rows.some((row) => row.result === "FAIL");
const manual = rows.some((row) => row.result === "MANUAL_REQUIRED");
const overall = fail ? "FAIL" : manual ? "MANUAL_REQUIRED" : "PASS";

const report = [
  "# Runtime DDL Removal Gate Result",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `Overall: \`${overall}\``,
  "",
  "| Gate | Result | Evidence | Notes |",
  "| --- | --- | --- | --- |",
  ...rows.map((row) => `| ${row.gate} | ${row.result} | ${row.evidence} | ${row.notes} |`),
  "",
  "This gate is read-only and does not remove runtime DDL."
];

fs.writeFileSync(path.resolve("RUNTIME_DDL_REMOVAL_GATE_RESULT.md"), `${report.join("\n")}\n`);
console.log(`RUNTIME_DDL_REMOVAL_GATE=${overall}`);
console.log(`RUNTIME_DDL_STATIC_ROWS=${findingRows.length}`);
console.log("Wrote RUNTIME_DDL_REMOVAL_GATE_RESULT.md");
process.exit(fail ? 1 : 0);

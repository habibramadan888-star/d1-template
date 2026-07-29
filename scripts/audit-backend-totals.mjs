import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");

const scanFiles = [
  "deploy-worker/src/index.js",
  "deploy-worker/public/employee-v3.html",
  "employee-v3.html",
  "index-51-main.js",
  "modules/finance/handover.mjs",
  "modules/finance/shadow-totals.mjs",
  "modules/worker/d1-write-plan-executor.mjs",
  "scripts/rehearse-rent-write-plan.mjs"
];

const totalPatterns = [
  {
    kind: "frontend-submitted-total",
    pattern: /\b(cash_handover|bank_transfer_total|bank_transfer_count|gross_received)\b/i,
    recommendation:
      "Backend must shadow-recompute these totals before they become accounting authority."
  },
  {
    kind: "numeric-operation",
    pattern: /\.(reduce|map|filter)\s*\(|Number\s*\(|parseFloat\s*\(|Math\.round\s*\(/,
    recommendation:
      "Numeric reductions must be reviewed before totals are treated as accounting authority."
  },
  {
    kind: "backend-session-total-parse",
    pattern:
      /session\.(cash_handover|bank_transfer_total|bank_transfer_count|gross_received)|Number\(String\(session\./,
    recommendation:
      "Legacy Worker parses submitted totals; P0-003 must compare against backend recompute."
  },
  {
    kind: "backend-recompute-evidence",
    pattern:
      /computeHandoverSummary|cash_handover_fils|bank_transfer_total_fils|gross_received_fils|SUM\(amount_fils\)/i,
    recommendation:
      "Keep as shadow/rehearsal evidence until production route is explicitly migrated."
  }
];

function rel(file) {
  return path.relative(rootDir, file).replaceAll("\\", "/");
}

function areaFor(file) {
  const relative = rel(file);
  if (/employee-v3\.html$/.test(relative)) return "Employee frontend";
  if (/index-51-main\.js$/.test(relative)) return "Owner frontend";
  if (/deploy-worker\/src\/index\.js$/.test(relative)) return "Worker backend";
  if (/modules\//.test(relative)) return "Shared module";
  if (/scripts\//.test(relative)) return "Local tooling";
  return "Other";
}

const findings = [];

for (const item of scanFiles) {
  const file = path.resolve(rootDir, item);
  if (!existsSync(file)) continue;
  const text = await readFile(file, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of totalPatterns) {
      if (!pattern.pattern.test(line)) continue;
      findings.push({
        area: areaFor(file),
        file: rel(file),
        line: index + 1,
        kind: pattern.kind,
        evidence: line.trim().slice(0, 180),
        recommendation: pattern.recommendation
      });
    }
  });
}

const counts = findings.reduce((out, item) => {
  out[item.kind] = (out[item.kind] || 0) + 1;
  return out;
}, {});

const details = findings
  .slice(0, 200)
  .map(
    (item) =>
      `| ${item.area} | \`${item.file}:${item.line}\` | ${item.kind} | \`${item.evidence.replaceAll("|", "\\|")}\` | ${item.recommendation} |`
  )
  .join("\n");

const report = `# Backend Totals Shadow Result

Generated: ${new Date().toISOString()}, Asia/Dubai

Scope: P0-003A static audit only. This report does not change dashboard totals, handover submission, Worker responses, database schema, or production configuration.

## Summary

| Metric | Count |
| --- | ---: |
| Frontend submitted total references | ${counts["frontend-submitted-total"] || 0} |
| Numeric reduction / operation references | ${counts["numeric-operation"] || 0} |
| Backend legacy submitted-total parse references | ${counts["backend-session-total-parse"] || 0} |
| Backend recompute / shadow evidence references | ${counts["backend-recompute-evidence"] || 0} |
| Total findings | ${findings.length} |

## Findings

| Area | File | Kind | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
${details || "| - | - | - | - | - |"}

## Boundary

The current production route is not changed by this scan. P0-003 remains Partial until backend recomputation becomes the authoritative response/write path and is covered by authenticated regression tests.
`;

await writeFile(
  path.join(rootDir, "BACKEND_TOTALS_SHADOW_RESULT.md"),
  await prettier.format(report, { parser: "markdown" }),
  "utf8"
);

console.log(`FRONTEND_SUBMITTED_TOTALS=${counts["frontend-submitted-total"] || 0}`);
console.log(`TOTAL_NUMERIC_OPERATIONS=${counts["numeric-operation"] || 0}`);
console.log(`BACKEND_LEGACY_TOTAL_PARSE=${counts["backend-session-total-parse"] || 0}`);
console.log(`BACKEND_RECOMPUTE_EVIDENCE=${counts["backend-recompute-evidence"] || 0}`);
console.log(`BACKEND_TOTAL_FINDINGS=${findings.length}`);
console.log("Wrote BACKEND_TOTALS_SHADOW_RESULT.md");

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");

const scanRoots = [
  "deploy-worker",
  "modules",
  "scripts",
  "tests",
  "migrations",
  "migration-drafts",
  "index-51-main.js",
  "employee-v3.html",
  "employee.html"
];

const excludedDirs = new Set([
  ".git",
  ".wrangler",
  ".wrangler-dryrun",
  "node_modules",
  "reconciliation-output"
]);

const excludedFiles = new Set(["scripts/audit-money-fields.mjs"]);

const extensions = new Set([".js", ".mjs", ".sql", ".html", ".json"]);

const moneyPattern =
  /\b(amount|rent|deposit|balance|total|paid|unpaid|arrears?|refund|cash|bank|transfer|handover|price|fee|income|revenue|collected|due|remaining|outstanding|payment|transaction|AED|dirham|fils)\b/i;
const schemaPattern = /\b(REAL|FLOAT|DOUBLE|NUMERIC|DECIMAL)\b/i;
const numberPattern = /\b(parseFloat|parseInt|Number)\s*\(|\.toFixed\s*\(|Math\.round\s*\(/;

function rel(file) {
  return path.relative(rootDir, file).replaceAll("\\", "/");
}

function areaFor(file) {
  const relative = rel(file);
  if (/^deploy-worker\/src\//.test(relative)) return "Worker backend";
  if (/^deploy-worker\/public\//.test(relative) || /^(employee|index-51)/.test(relative)) {
    return "Frontend";
  }
  if (/^migrations\//.test(relative) || /^migration-drafts\//.test(relative)) {
    return "Database SQL";
  }
  if (/^modules\//.test(relative)) return "Shared module";
  if (/^scripts\//.test(relative)) return "Tooling/test script";
  if (/^tests\//.test(relative)) return "Test";
  return "Other";
}

function recommendationFor(kind, file) {
  const area = areaFor(file);
  if (kind === "schema") {
    return "Migrate commercial money storage to INTEGER fils with legacy fallback and reconciliation.";
  }
  if (area === "Frontend") {
    return "Treat as display/input only; backend must parse and recompute authoritative integer fils.";
  }
  if (area === "Worker backend") {
    return "Replace with centralized money helper in P0-001B/C; do not trust JS Number as accounting authority.";
  }
  return "Keep documented as legacy risk unless guarded by integer-fils tests.";
}

async function walk(target) {
  const full = path.resolve(rootDir, target);
  const out = [];
  async function visit(current) {
    const stats = await import("node:fs/promises").then((fs) => fs.stat(current));
    if (stats.isDirectory()) {
      if (excludedDirs.has(path.basename(current))) return;
      for (const child of await readdir(current)) await visit(path.join(current, child));
      return;
    }
    if (!stats.isFile()) return;
    const relative = rel(current);
    if (excludedFiles.has(relative)) return;
    if (!extensions.has(path.extname(current))) return;
    out.push(current);
  }
  await visit(full);
  return out;
}

const files = [];
for (const root of scanRoots) {
  try {
    files.push(...(await walk(root)));
  } catch {
    // Optional source roots can be absent in partial exports.
  }
}

const findings = [];
const seen = new Set();

for (const file of files) {
  const relative = rel(file);
  if (seen.has(relative)) continue;
  seen.add(relative);
  const text = await readFile(file, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const hasMoney = moneyPattern.test(line);
    const hasSchema = schemaPattern.test(line);
    const hasNumber = numberPattern.test(line);
    if (!hasMoney && !hasSchema && !hasNumber) return;

    let kind = "money keyword";
    if (hasSchema) kind = "schema floating type";
    else if (hasNumber) kind = "JS number operation";

    findings.push({
      area: areaFor(file),
      file: relative,
      line: index + 1,
      kind,
      evidence: line.trim().slice(0, 180),
      recommendation: recommendationFor(
        hasSchema ? "schema" : hasNumber ? "number" : "keyword",
        file
      )
    });
  });
}

const schemaRiskCount = findings.filter((item) => item.kind === "schema floating type").length;
const jsNumberRiskCount = findings.filter((item) => item.kind === "JS number operation").length;
const frontendMoneyRiskCount = findings.filter(
  (item) => item.area === "Frontend" && item.kind !== "money keyword"
).length;
const backendMoneyRiskCount = findings.filter(
  (item) => ["Worker backend", "Shared module"].includes(item.area) && item.kind !== "money keyword"
).length;

const details = findings
  .slice(0, 350)
  .map(
    (item) =>
      `| ${item.area} | \`${item.file}:${item.line}\` | ${item.kind} | \`${item.evidence.replaceAll("|", "\\|")}\` | ${item.recommendation} |`
  );

const report = `# Money Precision Audit Result

Generated: 2026-05-24, Asia/Dubai

Scope: static source scan for P0-001A. This report is non-blocking and does not modify business calculations.

## Summary

| Metric | Count |
| --- | ---: |
| REAL / FLOAT / NUMERIC / DECIMAL risks | ${schemaRiskCount} |
| JS Number / parseFloat / parseInt / toFixed / Math.round risks | ${jsNumberRiskCount} |
| Frontend amount calculation risks | ${frontendMoneyRiskCount} |
| Backend amount calculation risks | ${backendMoneyRiskCount} |
| Total money-related findings scanned | ${findings.length} |

## Notes

- This scan intentionally includes legacy Worker and frontend code because P0-001A is an inventory task.
- Counts are risk indicators, not proof that every occurrence is an active production accounting defect.
- P0-001 remains Partial because this task does not migrate storage or live write paths to integer minor units.

## Detailed Findings

| Area | File | Kind | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
${details.join("\n")}

${findings.length > details.length ? `\nReport truncated to ${details.length} of ${findings.length} findings. Use \`npm run audit:money\` to regenerate counts.\n` : ""}
`;

const formatted = await prettier.format(report, { parser: "markdown" });
await writeFile(path.join(rootDir, "MONEY_PRECISION_AUDIT_RESULT.md"), formatted);

console.log(`REAL_FLOAT_RISKS=${schemaRiskCount}`);
console.log(`JS_NUMBER_PARSEFLOAT_RISKS=${jsNumberRiskCount}`);
console.log(`FRONTEND_MONEY_CALC_RISKS=${frontendMoneyRiskCount}`);
console.log(`BACKEND_MONEY_CALC_RISKS=${backendMoneyRiskCount}`);
console.log(`MONEY_FINDINGS=${findings.length}`);
console.log("Wrote MONEY_PRECISION_AUDIT_RESULT.md");

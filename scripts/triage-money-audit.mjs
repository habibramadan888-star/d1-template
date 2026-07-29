import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  ".tmp",
  ".wrangler",
  ".wrangler-dryrun",
  "node_modules",
  "reconciliation-output"
]);

const excludedFiles = new Set(["scripts/audit-money-fields.mjs", "scripts/triage-money-audit.mjs"]);

const extensions = new Set([".js", ".mjs", ".sql", ".html", ".json", ".md"]);

const moneyPattern =
  /\b(amount|rent|deposit|balance|total|paid|unpaid|arrears?|refund|cash|bank|transfer|handover|price|fee|income|revenue|collected|due|remaining|outstanding|payment|transaction|AED|dirham|fils)\b/i;
const schemaPattern = /\b(REAL|FLOAT|DOUBLE|NUMERIC|DECIMAL)\b/i;
const numberPattern = /\b(parseFloat|parseInt|Number)\s*\(|\.toFixed\s*\(|Math\.round\s*\(/;

const categoryOrder = [
  "P0 live financial authority risk",
  "P1 migration risk",
  "P2 frontend display / formatting risk",
  "Test-only usage",
  "Documentation / report usage",
  "Non-money Number usage",
  "False positive",
  "Legacy compatibility allowed for now",
  "Needs human review"
];

function rel(file) {
  return path.relative(rootDir, file).replaceAll("\\", "/");
}

function escapeCell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

async function walk(target) {
  const full = path.resolve(rootDir, target);
  const output = [];

  async function visit(current) {
    const { stat } = await import("node:fs/promises");
    const stats = await stat(current);
    if (stats.isDirectory()) {
      if (excludedDirs.has(path.basename(current))) return;
      for (const child of await readdir(current)) await visit(path.join(current, child));
      return;
    }
    if (!stats.isFile()) return;
    const relative = rel(current);
    if (excludedFiles.has(relative)) return;
    if (!extensions.has(path.extname(current))) return;
    output.push(current);
  }

  await visit(full);
  return output;
}

function areaFor(relative) {
  if (relative === "deploy-worker/src/index.js") return "Worker live backend";
  if (relative.startsWith("deploy-worker/src/")) return "Worker backend";
  if (
    relative.startsWith("deploy-worker/public/") ||
    relative === "employee-v3.html" ||
    relative === "employee.html" ||
    relative === "index-51-main.js"
  ) {
    return "Frontend";
  }
  if (relative.startsWith("migrations/") || relative.startsWith("migration-drafts/")) {
    return "Database SQL";
  }
  if (relative.startsWith("modules/finance/")) return "Finance module";
  if (relative.startsWith("scripts/")) return "Tooling";
  if (relative.startsWith("tests/")) return "Test";
  if (relative.endsWith(".md")) return "Documentation";
  return "Other";
}

function kindFor(line) {
  if (schemaPattern.test(line)) return "schema floating type";
  if (numberPattern.test(line)) return "JS number operation";
  if (moneyPattern.test(line)) return "money keyword";
  return "unknown";
}

function isMoneyLine(line) {
  return moneyPattern.test(line) || schemaPattern.test(line);
}

function phaseFor(category) {
  if (category.startsWith("P0")) return "P0-001E/P0-003 live authority gate";
  if (category.startsWith("P1")) return "P0-001E rehearsal then production migration review";
  if (category.startsWith("P2")) return "UI/display cleanup after backend authority";
  if (category === "Needs human review") return "Human review before Codex changes";
  return "No immediate migration action";
}

function categoryFor({ relative, line, kind, area }) {
  const lower = relative.toLowerCase();
  if (lower.endsWith(".md")) return "Documentation / report usage";
  if (relative.startsWith("tests/")) return "Test-only usage";
  if (relative.startsWith("scripts/")) return "Test-only usage";
  if (!isMoneyLine(line) && kind === "JS number operation") return "Non-money Number usage";
  if (line.includes("Generated:") || line.includes("Report truncated")) return "False positive";

  if (relative === "deploy-worker/src/index.js" && kind !== "money keyword") {
    return "P0 live financial authority risk";
  }
  if (
    relative === "deploy-worker/src/index.js" &&
    /amount|total|cash|bank|deposit|arrears/i.test(line)
  ) {
    return "P0 live financial authority risk";
  }
  if (area === "Database SQL" && kind === "schema floating type") return "P1 migration risk";
  if (area === "Frontend" && kind !== "money keyword")
    return "P2 frontend display / formatting risk";
  if (area === "Finance module") return "Legacy compatibility allowed for now";
  if (relative.includes("employee-patch-fragment") && kind !== "money keyword") {
    return "Needs human review";
  }
  if (kind === "schema floating type") return "P1 migration risk";
  return "Legacy compatibility allowed for now";
}

function riskScore(item) {
  const categoryScore = {
    "P0 live financial authority risk": 1000,
    "Needs human review": 800,
    "P1 migration risk": 700,
    "P2 frontend display / formatting risk": 400,
    "Legacy compatibility allowed for now": 250,
    "Non-money Number usage": 100,
    "Test-only usage": 50,
    "Documentation / report usage": 20,
    "False positive": 0
  }[item.category];
  const kindScore =
    item.kind === "schema floating type" ? 80 : item.kind === "JS number operation" ? 60 : 10;
  const liveScore = item.file === "deploy-worker/src/index.js" ? 200 : 0;
  return categoryScore + kindScore + liveScore;
}

function whyFor(item) {
  if (item.category === "P0 live financial authority risk") {
    return "Live Worker path can become accounting authority while still using legacy decimal or JS Number semantics.";
  }
  if (item.category === "P1 migration risk") {
    return "Schema or migration path still preserves legacy decimal storage and needs explicit reconciliation.";
  }
  if (item.category === "P2 frontend display / formatting risk") {
    return "Frontend can remain display/input only, but must not become accounting authority.";
  }
  if (item.category === "Needs human review") {
    return "The source may be legacy or generated, but it touches financial semantics and should not be auto-fixed.";
  }
  return "Tracked for inventory; not a direct live accounting authority finding.";
}

function actionFor(category) {
  if (category === "P0 live financial authority risk") {
    return "Review before live dual-write; fix only through staged backend authority and reconciliation gates.";
  }
  if (category === "P1 migration risk") {
    return "Include in local/staging dual-write migration rehearsal and production approval checklist.";
  }
  if (category === "P2 frontend display / formatting risk") {
    return "Defer until backend authority is ready; keep frontend as display/input.";
  }
  if (category === "Needs human review") return "Human review before any automated edit.";
  return "No immediate code change in P0-001D.";
}

const files = [];
for (const root of scanRoots) {
  try {
    files.push(...(await walk(root)));
  } catch {
    // Optional source roots can be absent.
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
  const area = areaFor(relative);
  lines.forEach((line, index) => {
    const hasMoney = moneyPattern.test(line);
    const hasSchema = schemaPattern.test(line);
    const hasNumber = numberPattern.test(line);
    if (!hasMoney && !hasSchema && !hasNumber) return;
    const kind = kindFor(line);
    const finding = {
      area,
      file: relative,
      line: index + 1,
      kind,
      sourceLine: line,
      evidence: line.trim().slice(0, 220)
    };
    finding.category = categoryFor({ ...finding, relative, line: finding.sourceLine });
    finding.score = riskScore(finding);
    finding.why = whyFor(finding);
    finding.phase = phaseFor(finding.category);
    finding.canCodexFixAlone = [
      "P2 frontend display / formatting risk",
      "Test-only usage"
    ].includes(finding.category)
      ? "limited"
      : "no";
    finding.needsHumanApproval = [
      "P0 live financial authority risk",
      "Needs human review",
      "P1 migration risk"
    ].includes(finding.category)
      ? "yes"
      : "no";
    findings.push(finding);
  });
}

const byCategory = new Map(categoryOrder.map((category) => [category, []]));
for (const finding of findings) {
  if (!byCategory.has(finding.category)) byCategory.set(finding.category, []);
  byCategory.get(finding.category).push(finding);
}

const triageRows = [...byCategory.entries()].map(([category, items]) => {
  const examples = items
    .slice(0, 4)
    .map((item) => `\`${item.file}:${item.line}\``)
    .join(", ");
  return `| ${category} | ${items.length} | ${examples || "-"} | ${whyFor({ category })} | ${actionFor(category)} |`;
});

const triageReport = await prettier.format(
  `# Money Audit Triage

Generated: ${new Date().toISOString()}, Asia/Dubai

Scope: P0-001D triage only. This report classifies static \`audit:money\` findings so raw counts do not drive unsafe bulk edits. It does not modify business logic, database rows, live financial formulas, live dashboard output, or production configuration.

## Triage Summary

| Category | Count | Example Files | Why It Matters | Action |
| --- | ---: | --- | --- | --- |
${triageRows.join("\n")}

## Interpretation

- P0 means a live backend path can become accounting authority while still depending on legacy decimal or JS Number behavior.
- P1 means a migration or schema path still requires explicit staged rehearsal and reconciliation.
- P2 frontend hits are important for data quality but must not be fixed by making frontend totals authoritative.
- Test, tooling, documentation, and false positive hits are tracked but are not blockers by themselves.
- This triage is an input to human review and P0-001E, not permission for production migration.
`,
  { parser: "markdown" }
);

const topRisks = [...findings].sort((a, b) => b.score - a.score).slice(0, 25);
const topRows = topRisks.map(
  (item, index) =>
    `| ${index + 1} | \`${item.file}:${item.line}\` | ${item.area} | ${item.kind} | \`${escapeCell(
      item.evidence
    )}\` | ${escapeCell(item.why)} | ${item.phase} | ${item.canCodexFixAlone} | ${item.needsHumanApproval} |`
);

const topReport = await prettier.format(
  `# Top 25 Money Risks

Generated: ${new Date().toISOString()}, Asia/Dubai

Scope: ranked human-review queue from \`npm run triage:money\`. These are not automatic fix targets.

| Rank | File | Function / Area | Pattern | Evidence | Why Risky | Suggested Fix Phase | Can Codex Fix Alone | Needs Human Approval |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
${topRows.join("\n")}
`,
  { parser: "markdown" }
);

await writeFile(path.join(rootDir, "MONEY_AUDIT_TRIAGE.md"), triageReport, "utf8");
await writeFile(path.join(rootDir, "TOP_25_MONEY_RISKS.md"), topReport, "utf8");

for (const [category, items] of byCategory) {
  console.log(`${category.replaceAll(" ", "_").toUpperCase()}=${items.length}`);
}
console.log(`MONEY_TRIAGE_FINDINGS=${findings.length}`);
console.log("Wrote MONEY_AUDIT_TRIAGE.md");
console.log("Wrote TOP_25_MONEY_RISKS.md");

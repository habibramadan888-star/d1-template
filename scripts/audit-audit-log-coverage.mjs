#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const inventoryPath = path.resolve("API_INVENTORY.md");
const workerPath = path.resolve("deploy-worker/src/index.js");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function splitMarkdownRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseInventory(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\|\s*(GET|POST|ANY)\s*\|/.test(line))
    .map((line) => {
      const cells = splitMarkdownRow(line);
      return {
        method: cells[0],
        path: cells[1]?.replace(/`/g, "") || "",
        purpose: cells[2] || "",
        roles: cells[4] || "",
        writes: cells[7] || "",
        financial: cells[8] || "",
        audit: cells[10] || "",
        risk: cells[11] || "",
        notes: cells[12] || ""
      };
    });
}

const workerSource = read(workerPath);
const routes = parseInventory(read(inventoryPath));

function isMutation(route) {
  return (
    route.method === "POST" || /writes|update|save|clear|delete|commit|entry/i.test(route.purpose)
  );
}

function isFinancial(route) {
  return (
    /Yes/i.test(route.financial) ||
    /sessions|transactions|arrear|deposit|rent|handover/i.test(route.writes)
  );
}

function routeHasSourceAuditEvidence(route) {
  const pathIndex = workerSource.indexOf(`"${route.path}"`);
  const altIndex = workerSource.indexOf(`'${route.path}'`);
  const index = pathIndex >= 0 ? pathIndex : altIndex;
  if (index < 0) return false;
  const window = workerSource.slice(
    Math.max(0, index - 2500),
    Math.min(workerSource.length, index + 6000)
  );
  return /\baudit\s*\(|audit_logs|empEvent\s*\(|entry_events|handover_audit_events/i.test(window);
}

const audited = routes
  .filter((route) => isMutation(route) || isFinancial(route))
  .map((route) => {
    const inventoryAudit = /Yes|Conditional|Planned/i.test(route.audit);
    const sourceAudit = routeHasSourceAuditEvidence(route);
    const status = inventoryAudit && sourceAudit ? "STATIC_EVIDENCE" : "MANUAL_REVIEW";
    const missing = [];
    if (!inventoryAudit) missing.push("inventory audit evidence missing");
    if (!sourceAudit) missing.push("source-near-route audit evidence not proven");
    if (isFinancial(route) && !/Yes/i.test(route.financial))
      missing.push("financial relevance indirect/unclear");
    return {
      ...route,
      mutation: isMutation(route),
      financialMutation: isMutation(route) && isFinancial(route),
      inventoryAudit,
      sourceAudit,
      status,
      missing
    };
  });

const summary = {
  reviewed: audited.length,
  financialMutations: audited.filter((row) => row.financialMutation).length,
  staticEvidence: audited.filter((row) => row.status === "STATIC_EVIDENCE").length,
  manualReview: audited.filter((row) => row.status === "MANUAL_REVIEW").length
};

const matrix = [
  "# Audit Log Coverage Matrix",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "Scope: static audit coverage review for API mutations and financial routes. This script is read-only and does not call APIs, deploy, migrate, or write D1.",
  "",
  "| Method | Path | Purpose | Financial Mutation | Inventory Audit | Source Audit Evidence | Status | Missing / Notes |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ...audited.map((row) =>
    [
      "|",
      row.method,
      `\`${row.path}\``,
      row.purpose,
      row.financialMutation ? "Yes" : "No",
      row.inventoryAudit ? "Yes" : "No",
      row.sourceAudit ? "Yes" : "No",
      row.status,
      row.missing.join("<br>") || row.notes || "none",
      "|"
    ].join(" | ")
  ),
  "",
  "## Required Follow-Up",
  "",
  "- Convert manual-review financial mutations into runtime tests that assert `audit_logs` or `entry_events` rows are written.",
  "- Define a unified immutable audit event model before production launch.",
  "- Keep PII and secret redaction requirements from `OBSERVABILITY_AND_ERROR_MONITORING_PLAN.md` in scope."
];

const result = [
  "# Audit Log Coverage Result",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "| Metric | Count |",
  "| --- | ---: |",
  `| Routes reviewed | ${summary.reviewed} |`,
  `| Financial mutations reviewed | ${summary.financialMutations} |`,
  `| Static audit evidence routes | ${summary.staticEvidence} |`,
  `| Manual review routes | ${summary.manualReview} |`,
  "",
  "Overall: `MANUAL_REQUIRED`",
  "",
  "Reasons:",
  "",
  "- Static audit evidence does not prove before/after completeness.",
  "- Some financial or sensitive routes still need runtime audit-row assertions.",
  "- A unified immutable audit event model is not live.",
  "",
  "No production deploy, migration, remote D1 access, or secret access was performed."
];

fs.writeFileSync(
  path.resolve("AUDIT_LOG_COVERAGE_MATRIX.md"),
  await prettier.format(`${matrix.join("\n")}\n`, { parser: "markdown" })
);
fs.writeFileSync(
  path.resolve("AUDIT_LOG_COVERAGE_RESULT.md"),
  await prettier.format(`${result.join("\n")}\n`, { parser: "markdown" })
);

console.log("AUDIT_LOG_COVERAGE=MANUAL_REQUIRED");
console.log(`AUDIT_LOG_ROUTES_REVIEWED=${summary.reviewed}`);
console.log(`AUDIT_LOG_MANUAL_REVIEW=${summary.manualReview}`);

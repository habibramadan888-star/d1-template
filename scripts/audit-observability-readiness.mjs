#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve("deploy-worker/src/index.js");
const source = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, "utf8") : "";

const patterns = [
  ["audit log writes", /audit_logs/gi],
  ["entry event writes", /entry_events/gi],
  ["request id references", /request[_-]?id/gi],
  ["console error", /console\.error/gi],
  ["console log", /console\.log/gi],
  ["structured error codes", /code\s*:/gi]
];

const rows = patterns.map(([label, pattern]) => {
  const count = (source.match(pattern) || []).length;
  return {
    check: label,
    result: count > 0 ? "PASS" : "WARNING",
    evidence: String(count),
    notes: count > 0 ? "present in Worker source" : "not detected in Worker source"
  };
});

rows.push({
  check: "production monitoring integration",
  result: "MANUAL_REQUIRED",
  evidence: "no third-party or Cloudflare alert config committed",
  notes: "human must confirm alert destinations and retention before launch"
});

rows.push({
  check: "secret safety",
  result: "PASS",
  evidence: "script is read-only",
  notes: "no secrets are required or printed"
});

const manual = rows.some((row) => row.result === "MANUAL_REQUIRED");
const warning = rows.some((row) => row.result === "WARNING");
const overall = manual ? "MANUAL_REQUIRED" : warning ? "WARNING" : "PASS";

const report = [
  "# Observability Readiness Result",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `Overall: \`${overall}\``,
  "",
  "| Check | Result | Evidence | Notes |",
  "| --- | --- | --- | --- |",
  ...rows.map((row) => `| ${row.check} | ${row.result} | ${row.evidence} | ${row.notes} |`),
  "",
  "This audit is read-only and does not connect external monitoring."
];

fs.writeFileSync(path.resolve("OBSERVABILITY_READINESS_RESULT.md"), `${report.join("\n")}\n`);
console.log(`OBSERVABILITY_READINESS=${overall}`);
console.log("Wrote OBSERVABILITY_READINESS_RESULT.md");

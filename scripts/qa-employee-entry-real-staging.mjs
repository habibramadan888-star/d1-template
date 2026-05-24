#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const env = process.env;

const required = [
  ["STAGING_WORKER_URL", env.STAGING_WORKER_URL],
  ["STAGING_D1_DATABASE", env.STAGING_D1_DATABASE],
  ["STAGING_ENTRYPOINT", env.STAGING_ENTRYPOINT],
  ["STAGING_EMPLOYEE_USERNAME", env.STAGING_EMPLOYEE_USERNAME],
  ["STAGING_OWNER_USERNAME", env.STAGING_OWNER_USERNAME]
];

const confirmations = [
  ["--confirm-staging-write", args.has("--confirm-staging-write")],
  ["--confirm-backup", args.has("--confirm-backup")],
  ["--confirm-rollback", args.has("--confirm-rollback")]
];

function looksProductionUrl(value) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return (
    lower.includes("production") ||
    lower.includes("prod") ||
    lower === "https://homelink-finance.workers.dev" ||
    lower.includes("homelink-finance.workers.dev")
  );
}

function writeReport(result, rows) {
  const lines = [
    "# Employee Entry Real Staging QA Dry-Run Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Result: \`${result}\``,
    "",
    "| Check | Result | Notes |",
    "| --- | --- | --- |",
    ...rows.map((row) => `| ${row.check} | ${row.result} | ${row.notes} |`),
    "",
    "This script does not deploy, migrate, or write staging data unless all explicit confirmations are supplied."
  ];
  fs.writeFileSync(
    path.resolve("EMPLOYEE_ENTRY_REAL_STAGING_QA_DRY_RUN_RESULT.md"),
    `${lines.join("\n")}\n`
  );
}

const rows = [];
let manualRequired = false;
let blocked = false;

for (const [name, value] of required) {
  if (value) {
    rows.push({
      check: name,
      result: "FOUND",
      notes: name.includes("USERNAME") ? "value present, not printed" : value
    });
  } else {
    manualRequired = true;
    rows.push({ check: name, result: "MISSING", notes: "manual staging input required" });
  }
}

if (looksProductionUrl(env.STAGING_WORKER_URL)) {
  blocked = true;
  rows.push({
    check: "production URL guard",
    result: "BLOCKED",
    notes: "STAGING_WORKER_URL looks like production; refusing staging QA"
  });
} else {
  rows.push({
    check: "production URL guard",
    result: env.STAGING_WORKER_URL ? "PASS" : "MANUAL_REQUIRED",
    notes: env.STAGING_WORKER_URL
      ? "URL does not match blocked production patterns"
      : "no URL provided"
  });
}

for (const [flag, present] of confirmations) {
  if (present) {
    rows.push({ check: flag, result: "CONFIRMED", notes: "explicit CLI confirmation present" });
  } else {
    manualRequired = true;
    rows.push({ check: flag, result: "MISSING", notes: "required before any staging write" });
  }
}

const wouldWrite =
  confirmations.every(([, present]) => present) && required.every(([, value]) => Boolean(value));
if (wouldWrite && !blocked) {
  rows.push({
    check: "write execution",
    result: "NOT_EXECUTED",
    notes:
      "write scenario intentionally not implemented in V4 preflight; use manual QA guide after human approval"
  });
  manualRequired = true;
} else {
  rows.push({
    check: "write execution",
    result: "DRY_RUN_ONLY",
    notes: "no remote write attempted"
  });
}

const result = blocked ? "BLOCKED" : manualRequired ? "MANUAL_REQUIRED" : "DRY_RUN_READY";
writeReport(result, rows);

console.log(`EMPLOYEE_ENTRY_STAGING_QA=${result}`);
console.log("Wrote EMPLOYEE_ENTRY_REAL_STAGING_QA_DRY_RUN_RESULT.md");
for (const row of rows) {
  console.log(`${row.check}: ${row.result}`);
}

process.exit(blocked ? 1 : 0);

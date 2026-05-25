#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const env = process.env;

function readTextIfExists(filePath) {
  try {
    return fs.readFileSync(path.resolve(filePath), "utf8");
  } catch {
    return "";
  }
}

function firstMatch(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : "";
}

function readSafeDefaults() {
  const wrangler = readTextIfExists("deploy-worker/wrangler.toml");
  const evidence = readTextIfExists("STAGING_QA_EVIDENCE_TEMPLATE.md");
  return {
    STAGING_WORKER_URL: firstMatch(evidence, /`(https:\/\/homelink-finance-staging\.[^`\s]+)`/),
    STAGING_D1_DATABASE: firstMatch(
      wrangler,
      /database_name\s*=\s*"([^"]*homelink-finance-staging[^"]*)"/
    ),
    STAGING_ENTRYPOINT: firstMatch(wrangler, /\[env\.staging\][\s\S]*?main\s*=\s*"([^"]+)"/),
    STAGING_EMPLOYEE_USERNAME: firstMatch(evidence, /`(employee_stg_qa_001)`/),
    STAGING_OWNER_USERNAME: firstMatch(evidence, /`(owner_stg_qa_001)`/)
  };
}

const safeDefaults = readSafeDefaults();

function valueFor(name) {
  return env[name] || safeDefaults[name] || "";
}

const required = [
  ["STAGING_WORKER_URL", valueFor("STAGING_WORKER_URL")],
  ["STAGING_D1_DATABASE", valueFor("STAGING_D1_DATABASE")],
  ["STAGING_ENTRYPOINT", valueFor("STAGING_ENTRYPOINT")],
  ["STAGING_EMPLOYEE_USERNAME", valueFor("STAGING_EMPLOYEE_USERNAME")],
  ["STAGING_OWNER_USERNAME", valueFor("STAGING_OWNER_USERNAME")]
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

const stagingWorkerUrl = valueFor("STAGING_WORKER_URL");

if (looksProductionUrl(stagingWorkerUrl)) {
  blocked = true;
  rows.push({
    check: "production URL guard",
    result: "BLOCKED",
    notes: "STAGING_WORKER_URL looks like production; refusing staging QA"
  });
} else {
  rows.push({
    check: "production URL guard",
    result: stagingWorkerUrl ? "PASS" : "MANUAL_REQUIRED",
    notes: stagingWorkerUrl ? "URL does not match blocked production patterns" : "no URL provided"
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

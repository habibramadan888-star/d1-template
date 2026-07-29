#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function read(file) {
  const target = path.resolve(file);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
}

function extractTomlValue(text, key) {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*\"([^\"]+)\"`, "m"));
  return match ? match[1] : "";
}

function extractFirstKvNamespaceId(text) {
  const match = text.match(/\[\[kv_namespaces\]\][\s\S]*?^\s*id\s*=\s*"([^"]+)"/m);
  return match ? match[1] : "";
}

const source = read("deploy-worker/wrangler.toml");
const embedded = read("deploy-worker/wrangler.embedded.toml");

const sourceName = extractTomlValue(source, "name");
const embeddedName = extractTomlValue(embedded, "name");
const sourceDb = source.match(/database_id\s*=\s*"([^"]+)"/)?.[1] || "";
const embeddedDb = embedded.match(/database_id\s*=\s*"([^"]+)"/)?.[1] || "";
const sourceKv = extractFirstKvNamespaceId(source);
const embeddedKv = extractFirstKvNamespaceId(embedded);

const rows = [
  {
    check: "source Worker config exists",
    result: source ? "PASS" : "FAIL",
    evidence: "deploy-worker/wrangler.toml",
    notes: sourceName || "missing"
  },
  {
    check: "embedded Worker config exists",
    result: embedded ? "PASS" : "FAIL",
    evidence: "deploy-worker/wrangler.embedded.toml",
    notes: embeddedName || "missing"
  },
  {
    check: "source/embedded Worker names separated",
    result: sourceName && embeddedName && sourceName !== embeddedName ? "PASS" : "MANUAL_REQUIRED",
    evidence: `${sourceName} / ${embeddedName}`,
    notes: "same Worker name requires human deploy-entrypoint discipline"
  },
  {
    check: "source/embedded D1 ids separated",
    result: sourceDb && embeddedDb && sourceDb !== embeddedDb ? "PASS" : "MANUAL_REQUIRED",
    evidence: `${sourceDb || "missing"} / ${embeddedDb || "missing"}`,
    notes: "same D1 id is acceptable for local dry-run only; not staging/prod separation"
  },
  {
    check: "source/embedded KV ids separated",
    result: sourceKv && embeddedKv && sourceKv !== embeddedKv ? "PASS" : "MANUAL_REQUIRED",
    evidence: `${sourceKv || "missing"} / ${embeddedKv || "missing"}`,
    notes: "same KV id is not sufficient for staging/prod separation"
  },
  {
    check: "APP_ENV configured in Wrangler",
    result: /APP_ENV/.test(`${source}\n${embedded}`) ? "PASS" : "MANUAL_REQUIRED",
    evidence: "wrangler vars scan",
    notes: "runtime APP_ENV must be explicit per environment"
  },
  {
    check: "dry-run deploy scripts",
    result: read("package.json").includes("--dry-run") ? "PASS" : "WARNING",
    evidence: "package.json",
    notes: "default build scripts remain dry-run"
  }
];

const fail = rows.some((row) => row.result === "FAIL");
const manual = rows.some((row) => row.result === "MANUAL_REQUIRED");
const warning = rows.some((row) => row.result === "WARNING");
const overall = fail ? "FAIL" : manual ? "MANUAL_REQUIRED" : warning ? "WARNING" : "PASS";

const report = [
  "# Environment Separation Audit Result",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `Overall: \`${overall}\``,
  "",
  "## Checks",
  "",
  ...rows.flatMap((row, index) => [
    `### ${index + 1}. ${row.check}`,
    "",
    `- Result: ${row.result}`,
    `- Evidence: ${row.evidence}`,
    `- Notes: ${row.notes}`,
    ""
  ]),
  "",
  "This audit is read-only and does not modify Wrangler config or deploy."
];

fs.writeFileSync(path.resolve("ENVIRONMENT_SEPARATION_AUDIT_RESULT.md"), `${report.join("\n")}\n`);
console.log(`ENVIRONMENT_SEPARATION_AUDIT=${overall}`);
console.log("Wrote ENVIRONMENT_SEPARATION_AUDIT_RESULT.md");
process.exit(fail ? 1 : 0);

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const root = process.cwd();
const sourcePath = path.join(root, "deploy-worker", "src", "index.js");
const embeddedPath = path.join(root, "deploy-worker", "src", "index.embedded.js");
const sourceConfigPath = path.join(root, "deploy-worker", "wrangler.toml");
const embeddedConfigPath = path.join(root, "deploy-worker", "wrangler.embedded.toml");
const outputPath = path.join(root, "EMBEDDED_WORKER_FRESHNESS_RESULT.md");
const jsonPath = path.join(root, ".tmp", "embedded-worker-freshness.json");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function includesAll(text, items) {
  return items.every((item) => text.includes(item));
}

function configMain(config) {
  const match = config.match(/^\s*main\s*=\s*"([^"]+)"/m);
  return match?.[1] || "";
}

const source = read(sourcePath);
const embedded = read(embeddedPath);
const sourceConfig = read(sourceConfigPath);
const embeddedConfig = read(embeddedConfigPath);
const sourceMain = configMain(sourceConfig);
const embeddedMain = configMain(embeddedConfig);

const criticalChecks = [
  {
    name: "staging handover route",
    required: ["/api/staging/handover/commit"]
  },
  {
    name: "staging feature flag",
    required: ["ENABLE_HANDOVER_ATOMIC_STAGING"]
  },
  {
    name: "production-disabled APP_ENV guard",
    required: ["HSC_ALLOWED_APP_ENVS", "APP_ENV"]
  },
  {
    name: "staging handover tables",
    required: ["handover_commits", "handover_commit_rows", "handover_idempotency_keys"]
  },
  {
    name: "delete_session void behavior",
    required: ["/api/delete_session", "voided_at", "void_reason", "void_source"]
  },
  {
    name: "auth smoke routes",
    required: ["/auth/login", "/auth/employee-login", "/api/me"]
  }
];

const checks = criticalChecks.map((check) => ({
  ...check,
  sourceHas: includesAll(source, check.required),
  embeddedHas: includesAll(embedded, check.required)
}));

const missingCritical = checks.filter((check) => check.sourceHas && !check.embeddedHas);
const generatedMarker = /generated|source hash|sha-?256|build-embedded/i.test(
  embedded.slice(0, 5000)
);
const embeddedConfigExists = fs.existsSync(embeddedConfigPath);
const sourceConfigUsesSource = sourceMain === "src/index.js";
const embeddedConfigUsesArtifact = embeddedMain === "src/index.embedded.js";

let result = "PASS";
const notes = [];

if (missingCritical.length && embeddedConfigUsesArtifact) {
  result = "MANUAL_REQUIRED";
  notes.push(
    "Embedded artifact is referenced by a deployable Wrangler config and is missing source-critical behavior."
  );
}

if (!generatedMarker) {
  if (result === "PASS") result = "WARNING";
  notes.push("Embedded artifact has no explicit generated source-hash marker.");
}

if (!embeddedConfigExists) {
  if (result === "PASS") result = "WARNING";
  notes.push("No embedded Wrangler config found; embedded deploy path may be legacy only.");
}

if (!sourceConfigUsesSource) {
  if (result === "PASS") result = "WARNING";
  notes.push("Primary wrangler.toml does not point to src/index.js.");
}

const payload = {
  result,
  sourcePath: path.relative(root, sourcePath),
  embeddedPath: path.relative(root, embeddedPath),
  sourceHash: sha256(source),
  embeddedHash: sha256(embedded),
  sourceMain,
  embeddedMain,
  generatedMarker,
  missingCritical: missingCritical.map((item) => item.name),
  checks: checks.map((check) => ({
    name: check.name,
    sourceHas: check.sourceHas,
    embeddedHas: check.embeddedHas
  })),
  notes
};

fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);

const markdown = await prettier.format(
  [
    "# Embedded Worker Freshness Result",
    "",
    "Scope: read-only P1-006 freshness gate. No deploy artifact was overwritten.",
    "",
    "## Result",
    "",
    `- Result: **${result}**`,
    `- Source Worker: \`${payload.sourcePath}\``,
    `- Embedded artifact: \`${payload.embeddedPath}\``,
    `- Source SHA-256: \`${payload.sourceHash}\``,
    `- Embedded SHA-256: \`${payload.embeddedHash}\``,
    `- Primary wrangler main: \`${sourceMain || "unknown"}\``,
    `- Embedded wrangler main: \`${embeddedMain || "unknown"}\``,
    `- Generated source-hash marker present: ${generatedMarker ? "Yes" : "No"}`,
    "",
    "## Critical Freshness Checks",
    "",
    "| Check | Source Has | Embedded Has | Status |",
    "| --- | --- | --- | --- |",
    ...checks.map(
      (check) =>
        `| ${check.name} | ${check.sourceHas ? "Yes" : "No"} | ${check.embeddedHas ? "Yes" : "No"} | ${
          check.sourceHas === check.embeddedHas ? "MATCH" : "DRIFT"
        } |`
    ),
    "",
    "## Notes",
    "",
    ...(notes.length ? notes.map((note) => `- ${note}`) : ["- No freshness warnings."]),
    "",
    "## Gate Meaning",
    "",
    "- `PASS`: artifact freshness is acceptable for the checked conditions.",
    "- `WARNING`: artifact may be stale or lacks freshness metadata, but no confirmed deploy-blocking critical drift was proven.",
    "- `MANUAL_REQUIRED`: deploy entrypoint or artifact freshness needs human approval before staging/production deploy.",
    "- `FAIL`: a confirmed active deploy artifact is missing critical behavior.",
    "",
    "Current recommendation: do not deploy through the embedded config until controlled generation and human diff review are completed.",
    ""
  ].join("\n"),
  { parser: "markdown" }
);

fs.writeFileSync(outputPath, markdown);

console.log(`EMBEDDED_WORKER_FRESHNESS_RESULT=${result}`);
console.log(`EMBEDDED_WORKER_MISSING_CRITICAL=${missingCritical.length}`);
console.log(`EMBEDDED_WORKER_FRESHNESS_REPORT=${path.relative(root, outputPath)}`);

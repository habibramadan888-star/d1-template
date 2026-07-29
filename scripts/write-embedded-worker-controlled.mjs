import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const root = process.cwd();
const sourcePath = path.join(root, "deploy-worker", "src", "index.js");
const targetPath = path.join(root, "deploy-worker", "src", "index.embedded.js");
const generatedPath = path.join(
  root,
  ".tmp",
  "embedded-worker-dry-run",
  "index.embedded.generated.js"
);
const backupRoot = path.join(root, ".tmp", "embedded-worker-backups");
const reportPath = path.join(root, "EMBEDDED_WORKER_CONTROLLED_WRITE_RESULT.md");

const criticalItems = [
  "/api/staging/handover/commit",
  "ENABLE_HANDOVER_ATOMIC_STAGING",
  "HSC_ALLOWED_APP_ENVS",
  "handover_commits",
  "handover_commit_rows",
  "handover_idempotency_keys",
  "/api/delete_session",
  "voided_at",
  "void_reason",
  "void_source"
];

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function readRequired(file) {
  if (!fs.existsSync(file)) throw new Error(`Required file missing: ${path.relative(root, file)}`);
  return fs.readFileSync(file, "utf8");
}

function missingCritical(text) {
  return criticalItems.filter((item) => !text.includes(item));
}

function assertNoSecretLikeText(text) {
  const patterns = [
    /JWT_SECRET\s*[:=]\s*["']?[^"'\s,}]+/i,
    /PW_SALT\s*[:=]\s*["']?[^"'\s,}]+/i,
    /TTLOCK_CLIENT_SECRET\s*[:=]\s*["']?[^"'\s,}]+/i,
    /LOCAL_MANAGER_PASSWORD\s*[:=]\s*["']?[^"'\s,}]+/i,
    /LOCAL_STAFF_PASSWORD\s*[:=]\s*["']?[^"'\s,}]+/i
  ];
  const hit = patterns.find((pattern) => pattern.test(text));
  if (hit) throw new Error(`Generated embedded artifact contains secret-like text: ${hit}`);
}

run(process.execPath, [path.join(root, "scripts", "generate-embedded-worker-dry-run.mjs")]);

const source = readRequired(sourcePath);
const oldEmbedded = readRequired(targetPath);
const generated = readRequired(generatedPath);
const generatedMissing = missingCritical(generated);
if (generatedMissing.length) {
  throw new Error(
    `Dry-run generated artifact missing critical item(s): ${generatedMissing.join(", ")}`
  );
}
assertNoSecretLikeText(generated);

fs.mkdirSync(backupRoot, { recursive: true });
const backupPath = path.join(
  backupRoot,
  `index.embedded.${new Date().toISOString().replace(/[:.]/g, "-")}.js`
);
fs.writeFileSync(backupPath, oldEmbedded, "utf8");
fs.writeFileSync(targetPath, generated, "utf8");

const newEmbedded = readRequired(targetPath);
const newMissing = missingCritical(newEmbedded);
if (newMissing.length) {
  fs.writeFileSync(targetPath, oldEmbedded, "utf8");
  throw new Error(
    `Controlled write failed critical check and was rolled back. Missing: ${newMissing.join(", ")}`
  );
}

const sourceHash = sha256(source);
const oldHash = sha256(oldEmbedded);
const generatedHash = sha256(generated);
const newHash = sha256(newEmbedded);

const report = await prettier.format(
  [
    "# Embedded Worker Controlled Write Result",
    "",
    "Scope: P1-006B controlled write. This is not a staging or production deploy and does not run D1 migrations.",
    "",
    "## Result",
    "",
    "- Result: **PASS**",
    `- Source Worker: \`${path.relative(root, sourcePath)}\``,
    `- Written target: \`${path.relative(root, targetPath)}\``,
    `- Backup path: \`${path.relative(root, backupPath)}\``,
    `- Dry-run generated source: \`${path.relative(root, generatedPath)}\``,
    `- Source SHA-256: \`${sourceHash}\``,
    `- Old embedded SHA-256: \`${oldHash}\``,
    `- Dry-run generated SHA-256: \`${generatedHash}\``,
    `- New embedded SHA-256: \`${newHash}\``,
    `- New matches dry-run generated: ${newHash === generatedHash ? "Yes" : "No"}`,
    "",
    "## Critical Item Verification",
    "",
    "| Item | New Embedded Has |",
    "| --- | --- |",
    ...criticalItems.map(
      (item) => `| \`${item}\` | ${newEmbedded.includes(item) ? "Yes" : "No"} |`
    ),
    "",
    "## Rollback",
    "",
    `- Before commit: copy \`${path.relative(root, backupPath)}\` back to \`${path.relative(root, targetPath)}\`, or run \`git restore -- deploy-worker/src/index.embedded.js\`.`,
    "- After commit: revert the controlled write commit.",
    "",
    "## Safety",
    "",
    "- No Wrangler deploy command was executed.",
    "- No D1 migration command was executed.",
    "- No production configuration was modified by this script.",
    ""
  ].join("\n"),
  { parser: "markdown" }
);

fs.writeFileSync(reportPath, report, "utf8");

console.log("EMBEDDED_WORKER_CONTROLLED_WRITE_RESULT=PASS");
console.log(`EMBEDDED_WORKER_BACKUP=${path.relative(root, backupPath)}`);
console.log(`EMBEDDED_WORKER_TARGET=${path.relative(root, targetPath)}`);
console.log(`EMBEDDED_WORKER_OLD_HASH=${oldHash}`);
console.log(`EMBEDDED_WORKER_NEW_HASH=${newHash}`);

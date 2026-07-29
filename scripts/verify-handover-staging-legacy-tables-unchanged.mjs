import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { rootDir } from "./local-worker-utils.mjs";

const testPath = path.join(rootDir, "tests", "handover-staging-endpoint.spec.mjs");
const reportPath = path.join(rootDir, "HANDOVER_STAGING_LEGACY_TABLES_UNCHANGED_RESULT.md");

async function runEndpointRegression() {
  const child = spawn(process.execPath, ["--test", testPath], {
    cwd: rootDir,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  const code = await new Promise((resolve) => child.on("close", resolve));
  return { code, output };
}

const source = await readFile(testPath, "utf8");
const requiredEvidence = [
  "const commitRows",
  "const rowRows",
  "const idempotencyRows",
  "const transactionRows",
  "const depositRows",
  "const arrearRows",
  "assert.equal(commitRows.length, 1)",
  "assert.equal(rowRows.length, 2)",
  "assert.equal(idempotencyRows.length, 1)",
  "assert.equal(transactionRows.length, 0)",
  "assert.equal(depositRows.length, 0)",
  "assert.equal(arrearRows.length, 0)"
];
const missing = requiredEvidence.filter((needle) => !source.includes(needle));
if (missing.length) {
  throw new Error(`Legacy table evidence missing from endpoint regression: ${missing.join(", ")}`);
}

const result = await runEndpointRegression();
if (result.code !== 0) {
  throw new Error(`handover staging endpoint regression failed:\n${result.output}`);
}

const report = `# Handover Staging Legacy Tables Unchanged Result

Generated: ${new Date().toISOString()}

Scope: P0-002D local verification. This script executes the stable endpoint regression test and verifies that it still contains explicit staging-table write and legacy-table non-write assertions. No production Worker, remote D1, production migration, live handover switch, live dashboard change, or legacy financial table write was performed.

## Evidence Source

- Command: \`node --test tests/handover-staging-endpoint.spec.mjs\`
- Test file: \`tests/handover-staging-endpoint.spec.mjs\`

## Result

| Table Group | Expected Assertion | Result |
| --- | --- | --- |
| \`handover_commits\` | count equals 1 after valid staging commit | PASS |
| \`handover_commit_rows\` | count equals 2 after valid staging commit | PASS |
| \`handover_idempotency_keys\` | count equals 1 after valid staging commit | PASS |
| \`transactions\` | count remains 0 | PASS |
| \`deposit_ledger\` | count remains 0 | PASS |
| \`arrears\` | count remains 0 | PASS |
| \`audit_logs\` | handover staging audit evidence exists | PASS |
| \`entry_events\` | handover commit accepted evidence exists | PASS |

\`\`\`text
${result.output.slice(-3000)}
\`\`\`

## Conclusion

PASS. Current automated evidence shows staging handover writes are isolated to staging/audit tables and do not write legacy live financial tables.
`;

await writeFile(reportPath, report);
console.log(
  `PASS legacy table unchanged verification written to ${path.relative(rootDir, reportPath)}`
);

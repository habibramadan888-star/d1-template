import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { rootDir } from "./local-worker-utils.mjs";

const testPath = path.join(rootDir, "tests", "handover-staging-endpoint.spec.mjs");
const reportPath = path.join(rootDir, "HANDOVER_STAGING_DASHBOARD_UNCHANGED_RESULT.md");

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
  "const beforeHistory",
  "const afterHistory",
  "assert.deepEqual(await jsonBody(afterHistory), beforeHistoryBody)",
  "transactionRows.length, 0",
  "depositRows.length, 0",
  "arrearRows.length, 0"
];
const missing = requiredEvidence.filter((needle) => !source.includes(needle));
if (missing.length) {
  throw new Error(
    `Dashboard unchanged evidence missing from endpoint regression: ${missing.join(", ")}`
  );
}

const result = await runEndpointRegression();
if (result.code !== 0) {
  throw new Error(`handover staging endpoint regression failed:\n${result.output}`);
}

const report = `# Handover Staging Dashboard Unchanged Result

Generated: ${new Date().toISOString()}

Scope: P0-002D local verification. This script executes the stable endpoint regression test and verifies that it still contains explicit owner-history and legacy-table unchanged assertions. No production Worker, remote D1, production migration, live handover switch, live dashboard change, or legacy financial table write was performed.

## Evidence Source

- Command: \`node --test tests/handover-staging-endpoint.spec.mjs\`
- Test file: \`tests/handover-staging-endpoint.spec.mjs\`
- Required assertions found:
  - captures owner \`/api/history\` before staging submit
  - captures owner \`/api/history\` after staging submit
  - asserts before/after owner history snapshots are equal
  - asserts \`transactions\`, \`deposit_ledger\`, and \`arrears\` remain empty

## Result

| Check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| Endpoint regression command | PASS | \`node --test tests/handover-staging-endpoint.spec.mjs\` exit code 0 | Stable automated evidence. |
| Owner history unchanged assertion present | PASS | \`assert.deepEqual(await jsonBody(afterHistory), beforeHistoryBody)\` | Staging endpoint does not affect current owner history source. |
| Legacy financial table unchanged assertions present | PASS | \`transactions\`, \`deposit_ledger\`, \`arrears\` count assertions | Staging endpoint does not write live financial tables. |

\`\`\`text
${result.output.slice(-3000)}
\`\`\`

## Conclusion

PASS. Current automated evidence shows the staging endpoint leaves current owner history/dashboard source data unchanged while writing only staging/audit evidence.
`;

await writeFile(reportPath, report);
console.log(
  `PASS dashboard unchanged verification written to ${path.relative(rootDir, reportPath)}`
);

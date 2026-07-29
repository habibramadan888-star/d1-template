import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { rootDir, sanitizeLog } from "./local-worker-utils.mjs";

const testFile = path.join(rootDir, "tests", "employee-entry-route-switch-rehearsal.spec.mjs");

function runTest() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--test", testFile], {
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
    child.on("close", (code) => resolve({ code, output: sanitizeLog(output) }));
  });
}

function resultText({ code, output }) {
  const passed = code === 0;
  const generated = new Date().toISOString();
  return `# Employee Entry Route Switch Rehearsal Result

Generated: ${generated}

Scope: P0-001J local/staging-only rehearsal for \`POST /api/employee/entry\`.

This rehearsal did not execute production deployment, staging deployment, production D1 migration, remote D1 migration, production config changes, or secret writes. It did not delete the legacy route or legacy fields.

## Result

| Check | Result |
| --- | --- |
| Overall | ${passed ? "PASS" : "FAIL"} |
| Production behavior remains legacy | ${passed ? "PASS" : "SEE TEST OUTPUT"} |
| Feature flag off remains legacy | ${passed ? "PASS" : "SEE TEST OUTPUT"} |
| Local/staging flag on adapter rehearsal | ${passed ? "PASS" : "SEE TEST OUTPUT"} |
| Invalid money rejected before legacy write | ${passed ? "PASS" : "SEE TEST OUTPUT"} |
| Owner/admin rejected in adapter rehearsal mode | ${passed ? "PASS" : "SEE TEST OUTPUT"} |
| Voided row skipped before legacy write | ${passed ? "PASS" : "SEE TEST OUTPUT"} |
| Rollback by feature flag off | ${passed ? "PASS" : "SEE TEST OUTPUT"} |

## Command

\`\`\`text
node --test tests/employee-entry-route-switch-rehearsal.spec.mjs
\`\`\`

## Output

\`\`\`text
${output}
\`\`\`
`;
}

function rollbackText(passed) {
  return `# Employee Entry Route Switch Rollback Result

Generated: ${new Date().toISOString()}

| Rollback Control | Expected | Result |
| --- | --- | --- |
| \`APP_ENV=production\` with flag true | Legacy behavior, no adapter metadata | ${passed ? "PASS" : "SEE REHEARSAL RESULT"} |
| Local/test with flag false | Legacy behavior, no adapter metadata | ${passed ? "PASS" : "SEE REHEARSAL RESULT"} |
| Local/test with flag true | Adapter pre-validation before legacy write | ${passed ? "PASS" : "SEE REHEARSAL RESULT"} |

Conclusion: ${passed ? "Feature flag rollback is available for local/staging rehearsal." : "Rollback evidence is incomplete; do not proceed."}
`;
}

function safetyText(passed) {
  return `# Employee Entry Route Switch Safety Audit

Generated: ${new Date().toISOString()}

| Safety Boundary | Result | Evidence |
| --- | --- | --- |
| No production deploy | PASS | Script only runs local Worker tests. |
| No production or remote D1 migration | PASS | Tests use isolated local D1 via Wrangler local persistence. |
| Production route remains legacy | ${passed ? "PASS" : "SEE REHEARSAL RESULT"} | Production APP_ENV test expects no adapter metadata and successful legacy write. |
| Feature flag off remains legacy | ${passed ? "PASS" : "SEE REHEARSAL RESULT"} | Rollback test expects no adapter metadata and successful legacy write. |
| Adapter invalid money rejects before write | ${passed ? "PASS" : "SEE REHEARSAL RESULT"} | Invalid amount test checks transaction count unchanged. |
| Adapter audit evidence exists | ${passed ? "PASS" : "SEE REHEARSAL RESULT"} | Enabled-path tests check audit_logs and entry_events counts. |
| Dashboard formula changed | NO | This task does not modify dashboard code. Existing dashboard unchanged regression remains separate. |
| Live financial formula changed | NO | Adapter pre-validation runs before existing legacy write path; legacy calculation code is preserved. |
`;
}

function summaryText(passed) {
  return `# P0-001J Employee Entry Route Switch Summary

Generated: ${new Date().toISOString()}

P0-001 status after this task should be:

\`Partial - employee entry live route switch rehearsal ${passed ? "passed" : "blocked"}\`

## What Changed

- Added a local/staging-only \`ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE\` gate for \`POST /api/employee/entry\`.
- Production and feature-flag-off behavior continue through the legacy path.
- Local/staging flag-on behavior runs adapter pre-validation before legacy write.
- Invalid adapter drafts are rejected before legacy write.
- Adapter pre-validation writes audit/entry event evidence.

## What Did Not Change

- No production deployment.
- No production or remote D1 migration.
- No dashboard live result switch.
- No live financial formula replacement.
- No legacy route or legacy field deletion.
- No P0-008 receivables implementation.
- No P0-006 tenant isolation rewrite.
`;
}

async function main() {
  const result = await runTest();
  const passed = result.code === 0;
  await writeFile("EMPLOYEE_ENTRY_ROUTE_SWITCH_REHEARSAL_RESULT.md", resultText(result));
  await writeFile("EMPLOYEE_ENTRY_ROUTE_SWITCH_ROLLBACK_RESULT.md", rollbackText(passed));
  await writeFile("EMPLOYEE_ENTRY_ROUTE_SWITCH_SAFETY_AUDIT.md", safetyText(passed));
  await writeFile("P0_001J_EMPLOYEE_ENTRY_ROUTE_SWITCH_SUMMARY.md", summaryText(passed));
  console.log(`EMPLOYEE_ENTRY_ROUTE_SWITCH_REHEARSAL=${passed ? "PASS" : "FAIL"}`);
  console.log("Wrote EMPLOYEE_ENTRY_ROUTE_SWITCH_REHEARSAL_RESULT.md");
  console.log("Wrote EMPLOYEE_ENTRY_ROUTE_SWITCH_ROLLBACK_RESULT.md");
  console.log("Wrote EMPLOYEE_ENTRY_ROUTE_SWITCH_SAFETY_AUDIT.md");
  console.log("Wrote P0_001J_EMPLOYEE_ENTRY_ROUTE_SWITCH_SUMMARY.md");
  if (!passed) process.exit(result.code || 1);
}

main().catch((error) => {
  console.error(`FAIL ${sanitizeLog(error?.stack || error?.message || error)}`);
  process.exit(1);
});

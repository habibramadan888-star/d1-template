import { strict as assert } from "node:assert";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  jsonBody,
  loginEmployee,
  loginOwner,
  prepareLocalHandoverD1,
  request,
  responseSummary,
  stagingHandoverEndpoint,
  startHandoverWorker,
  validHandoverPayload
} from "./handover-staging-validation-utils.mjs";
import { removeDirWithRetries, rootDir, stopProcessTree } from "./local-worker-utils.mjs";

const reportPath = path.join(rootDir, "HANDOVER_STAGING_MANUAL_COMMANDS.md");
const rows = [];
const commandExamples = [];
const workers = [];

function addResult(testId, purpose, response, body, expected, notes) {
  rows.push({
    testId,
    purpose,
    result: responseSummary(response.status, body),
    expected,
    pass: response.status === expected.status && (!expected.code || body.code === expected.code),
    notes
  });
}

function powershellCommand(title, body, cookiePlaceholder = "<EMPLOYEE_COOKIE>") {
  const json = JSON.stringify(body, null, 2);
  commandExamples.push(`### ${title}

\`\`\`powershell
$body = @'
${json}
'@
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8903${stagingHandoverEndpoint}" -Headers @{ Cookie = "${cookiePlaceholder}" } -ContentType "application/json" -Body $body
\`\`\`
`);
}

async function startScenarioWorker({ port, persistTo, vars, migrate = false, seed = false }) {
  if (migrate) await prepareLocalHandoverD1({ persistTo, seed });
  const workerRun = await startHandoverWorker({ port, persistTo, vars });
  const run = { ...workerRun, persistTo };
  workers.push(run);
  return run;
}

async function closeScenarioWorker(run, label) {
  await stopProcessTree(run.worker, { label });
  await removeDirWithRetries(run.persistTo, { label: `${label} D1` });
  const index = workers.indexOf(run);
  if (index >= 0) workers.splice(index, 1);
}

try {
  const productionPersistTo = await mkdtemp(path.join(tmpdir(), "homelink-manual-hsc-prod-"));
  const productionRun = await startScenarioWorker({
    port: 8901,
    persistTo: productionPersistTo,
    vars: { APP_ENV: "production", ENABLE_HANDOVER_ATOMIC_STAGING: "true" }
  });
  const productionResponse = await request(productionRun.baseUrl, stagingHandoverEndpoint, {
    method: "POST",
    body: JSON.stringify(validHandoverPayload())
  });
  addResult(
    "MAN-HSC-001",
    "production disabled",
    productionResponse,
    await jsonBody(productionResponse),
    { status: 404 },
    "Production must hide the staging endpoint."
  );
  await closeScenarioWorker(productionRun, "manual production-disabled worker");

  const disabledPersistTo = await mkdtemp(path.join(tmpdir(), "homelink-manual-hsc-disabled-"));
  const disabledRun = await startScenarioWorker({
    port: 8902,
    persistTo: disabledPersistTo,
    vars: { APP_ENV: "test", ENABLE_HANDOVER_ATOMIC_STAGING: "false" }
  });
  const disabledResponse = await request(disabledRun.baseUrl, stagingHandoverEndpoint, {
    method: "POST",
    body: JSON.stringify(validHandoverPayload())
  });
  addResult(
    "MAN-HSC-002",
    "feature flag off",
    disabledResponse,
    await jsonBody(disabledResponse),
    { status: 403, code: "FEATURE_DISABLED" },
    "Non-production route must still require the explicit feature flag."
  );
  await closeScenarioWorker(disabledRun, "manual feature-disabled worker");

  const enabledPersistTo = await mkdtemp(path.join(tmpdir(), "homelink-manual-hsc-enabled-"));
  const enabledRun = await startScenarioWorker({
    port: 8903,
    persistTo: enabledPersistTo,
    migrate: true,
    seed: true,
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_HANDOVER_ATOMIC_STAGING: "true"
    }
  });
  const employeeCookie = await loginEmployee(enabledRun.baseUrl);
  const ownerCookie = await loginOwner(enabledRun.baseUrl);

  const validPayload = validHandoverPayload();
  powershellCommand("Valid employee submit", validPayload);
  const validResponse = await request(enabledRun.baseUrl, stagingHandoverEndpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(validPayload)
  });
  const validBody = await jsonBody(validResponse);
  addResult(
    "MAN-HSC-003",
    "employee valid submit",
    validResponse,
    validBody,
    { status: 201 },
    "Writes staging tables only."
  );

  powershellCommand("Replay same idempotency key", validPayload);
  const replayResponse = await request(enabledRun.baseUrl, stagingHandoverEndpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(validPayload)
  });
  addResult(
    "MAN-HSC-004",
    "idempotent replay",
    replayResponse,
    await jsonBody(replayResponse),
    { status: 200 },
    "Weak-network retry should replay without duplicate rows."
  );

  const tamperedPayload = validHandoverPayload({
    session_id: "manual-hsc-session-tampered",
    idempotency_key: "manual-hsc-key-tampered",
    frontend_totals: {
      cash_handover: "101.00",
      bank_transfer_total: "200.00",
      bank_transfer_count: 1,
      gross_received: "301.00",
      session_total: "301.00"
    }
  });
  powershellCommand("Frontend totals tampered", tamperedPayload);
  const tamperedResponse = await request(enabledRun.baseUrl, stagingHandoverEndpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(tamperedPayload)
  });
  addResult(
    "MAN-HSC-005",
    "frontend totals mismatch",
    tamperedResponse,
    await jsonBody(tamperedResponse),
    { status: 422, code: "FRONTEND_TOTALS_MISMATCH" },
    "Staging policy must reject mismatched frontend totals."
  );

  const voidedPayload = validHandoverPayload({
    session_id: "manual-hsc-session-voided",
    idempotency_key: "manual-hsc-key-voided",
    rows: [{ ...validHandoverPayload().rows[0], status: "VOIDED" }],
    frontend_totals: {
      cash_handover: "100.00",
      bank_transfer_total: "0.00",
      bank_transfer_count: 0,
      gross_received: "100.00",
      session_total: "100.00"
    }
  });
  powershellCommand("Voided row rejection", voidedPayload);
  const voidedResponse = await request(enabledRun.baseUrl, stagingHandoverEndpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(voidedPayload)
  });
  addResult(
    "MAN-HSC-006",
    "voided row reject",
    voidedResponse,
    await jsonBody(voidedResponse),
    { status: 422, code: "VOIDED_REJECTED" },
    "Voided rows cannot be recommitted as active handover rows."
  );

  const ownerResponse = await request(enabledRun.baseUrl, stagingHandoverEndpoint, {
    method: "POST",
    headers: { Cookie: ownerCookie },
    body: JSON.stringify(
      validHandoverPayload({
        session_id: "manual-hsc-session-owner",
        idempotency_key: "manual-hsc-key-owner"
      })
    )
  });
  addResult(
    "MAN-HSC-007",
    "owner submit reject",
    ownerResponse,
    await jsonBody(ownerResponse),
    { status: 403 },
    "Owner/manager/admin roles must not submit employee handover."
  );

  for (const row of rows) assert.equal(row.pass, true, `${row.testId} failed`);

  const reportRows = rows
    .map(
      (row) =>
        `| ${row.testId} | ${row.purpose} | ${row.expected.status}${row.expected.code ? ` ${row.expected.code}` : ""} | ${row.result} | ${row.pass ? "PASS" : "FAIL"} | ${row.notes} |`
    )
    .join("\n");

  const report = `# Handover Staging Manual Commands

Generated: ${new Date().toISOString()}

Scope: P0-002D local/staging manual validation helper. It executed safe local scenarios and generated copyable PowerShell examples with redacted cookies. No production Worker, remote D1, production migration, live employee flow switch, live dashboard change, or legacy financial table write was performed.

## Automated Local Results

| Test ID | Purpose | Expected | Actual | Result | Notes |
| --- | --- | --- | --- | --- | --- |
${reportRows}

## Cookie Handling

The script logs in with local dev credentials from \`deploy-worker/.dev.vars\` but does not print actual cookies or secrets. Replace \`<EMPLOYEE_COOKIE>\` with a manually obtained local employee session cookie when using the commands below.

## Copyable PowerShell Commands

${commandExamples.join("\n")}

## Manual Follow-up

Run \`npm run verify:dashboard-unchanged\` and \`npm run verify:handover-legacy-unchanged\` after manual command testing to confirm live owner surfaces and legacy financial tables remain unchanged.
`;

  await writeFile(reportPath, report);
  console.log(
    `PASS manual handover staging validation written to ${path.relative(rootDir, reportPath)}`
  );
} finally {
  for (const run of workers.reverse()) {
    await stopProcessTree(run.worker, { label: `manual handover worker ${run.baseUrl}` });
    await removeDirWithRetries(run.persistTo, { label: `manual handover D1 ${run.baseUrl}` });
  }
}

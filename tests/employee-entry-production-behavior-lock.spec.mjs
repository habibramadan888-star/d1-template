import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  cleanupEmployeeEntryWorker,
  employeeEntryCounts,
  jsonBody,
  legacyRentPayload,
  loginOwner,
  postEmployeeEntry,
  startEmployeeEntryWorker
} from "./helpers/employee-entry-route-switch-fixture.mjs";

const workerRuns = [];

after(async () => {
  for (const run of workerRuns.reverse()) {
    await cleanupEmployeeEntryWorker(run);
  }
});

async function startLockWorker(vars, label) {
  const run = await startEmployeeEntryWorker({ vars, label });
  workerRuns.push(run);
  return run;
}

async function assertLegacyProductionSubmit(run, payloadId) {
  const ownerCookie = await loginOwner(run.baseUrl);
  const before = employeeEntryCounts(run.persistTo);
  const response = await postEmployeeEntry(run.baseUrl, ownerCookie, legacyRentPayload(payloadId));
  if (response.status !== 200) {
    assert.fail(
      `legacy production submit expected 200, got ${response.status}: ${await response.text()}`
    );
  }
  const body = await jsonBody(response);
  assert.equal(body.success, true);
  assert.equal(body.adapter_live_route_rehearsal, undefined);
  assert.equal(body.code, undefined);
  const after = employeeEntryCounts(run.persistTo);
  assert.equal(after.transactions_count, before.transactions_count + 1);
  assert.equal(after.sessions_count, before.sessions_count + 1);
  assert.equal(after.adapter_audit_count, before.adapter_audit_count);
  assert.equal(after.adapter_event_count, before.adapter_event_count);
}

test("production APP_ENV with adapter flag true remains legacy and exposes no adapter fields", async () => {
  const run = await startLockWorker(
    { APP_ENV: "production", ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true" },
    "production flag true employee entry lock worker"
  );
  await assertLegacyProductionSubmit(run, `prod-flag-true-${Date.now()}`);
});

test("production APP_ENV with adapter flag false remains legacy", async () => {
  const run = await startLockWorker(
    { APP_ENV: "production", ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "false" },
    "production flag false employee entry lock worker"
  );
  await assertLegacyProductionSubmit(run, `prod-flag-false-${Date.now()}`);
});

test("missing APP_ENV does not enable adapter even when flag is true", async () => {
  const run = await startLockWorker(
    { APP_ENV: "", ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true" },
    "missing app env employee entry lock worker"
  );
  await assertLegacyProductionSubmit(run, `missing-env-${Date.now()}`);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createTenantScopeStagingWiringRehearsal } from "../scripts/rehearse-tenant-scope-staging-wiring.mjs";

const confirmations = [
  "--confirm-staging-tenant-scope-wiring",
  "--confirm-backup",
  "--confirm-rollback",
  "--confirm-auth-claim-review",
  "--confirm-legacy-corpid-fallback-preserved"
];

test("rehearsal blocks when approval flags are missing", async () => {
  const result = await createTenantScopeStagingWiringRehearsal([]);

  assert.equal(result.overall, "BLOCKED");
  assert.equal(result.summary.missingConfirmations, 5);
  assert.equal(result.summary.routeScenarioCount, 0);
  assert.equal(result.summary.queryScenarioCount, 0);
});

test("approved rehearsal runs route and query scenarios", async () => {
  const result = await createTenantScopeStagingWiringRehearsal(confirmations);

  assert.equal(result.overall, "PASS");
  assert.equal(result.summary.missingConfirmations, 0);
  assert.equal(result.summary.blockedCount, 0);
  assert.equal(result.summary.routeScenarioCount, 11);
  assert.equal(result.summary.queryScenarioCount, 4);
  assert.equal(result.summary.crossTenantRemovedCount, 6);
});

test("rehearsal proves off to on to rollback false flag behavior", async () => {
  const result = await createTenantScopeStagingWiringRehearsal(confirmations);

  assert.equal(
    result.modeRows.every((row) => row.Result === "PASS"),
    true
  );
  assert.equal(
    result.rollbackRows.every((row) => row.Result === "PASS"),
    true
  );
  assert.match(result.modeRows[0].Actual, /false \/ LEGACY/);
  assert.match(result.modeRows[2].Actual, /true \/ TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE/);
  assert.match(result.rollbackRows[0]["Actual After"], /false \/ LEGACY/);
});

test("production remains disabled even if rehearsal flags are true", async () => {
  const result = await createTenantScopeStagingWiringRehearsal(confirmations);

  assert.equal(
    result.productionRows.every((row) => row.Result === "PASS"),
    true
  );
  assert.equal(
    result.productionRows.every((row) => row.Actual === "disabled"),
    true
  );
});

test("route rehearsal keeps expected allow and deny decisions", async () => {
  const result = await createTenantScopeStagingWiringRehearsal(confirmations);
  const ownerDenied = result.routeRows.find(
    (row) => row.Scenario === "owner A denied company B history"
  );
  const employeeAllowed = result.routeRows.find(
    (row) => row.Scenario === "employee A own property entry"
  );

  assert.equal(ownerDenied["Actual Allowed"], "no");
  assert.equal(employeeAllowed["Actual Allowed"], "yes");
});

test("dashboard history rehearsal removes cross-tenant rows without dashboard mutation", async () => {
  const result = await createTenantScopeStagingWiringRehearsal(confirmations);
  const ownerAHistory = result.queryRows.find(
    (row) => row.Scenario === "owner A history query removes company B rows"
  );

  assert.equal(ownerAHistory.Result, "PASS");
  assert.equal(ownerAHistory["Cross-Tenant Removed"], "arrear_b_1");
  assert.equal(
    result.queryRows.every((row) => row.Mode === "TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE"),
    true
  );
});

test("rehearsal script source does not call production or D1", () => {
  const source = readFileSync(
    new URL("../scripts/rehearse-tenant-scope-staging-wiring.mjs", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /wrangler/i);
  assert.doesNotMatch(source, /d1\s+execute/i);
  assert.doesNotMatch(source, /UPDATE\s+/i);
  assert.doesNotMatch(source, /INSERT\s+/i);
  assert.doesNotMatch(source, /DELETE\s+/i);
});

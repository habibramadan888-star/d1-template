import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createTenantScopeBackfillRows,
  summarizeTenantScopeBackfillRows
} from "../scripts/gate-tenant-scope-backfill-reconciliation.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/tenant-scope/local-staging.json", import.meta.url), "utf8")
);

test("fixture rows map legacy corpid records to canonical company/property scope", () => {
  const rows = createTenantScopeBackfillRows(fixture);
  const summary = summarizeTenantScopeBackfillRows(rows);

  assert.equal(summary.overall, "PASS");
  assert.equal(summary.rowCount, 3);
  assert.equal(summary.blockedCount, 0);
  assert.ok(rows.every((row) => row["Mapping Status"] === "MAPPABLE"));
});

test("same legacy corpid bed/cid collisions are warning evidence, not silent matches", () => {
  const rows = createTenantScopeBackfillRows(fixture);
  const sessionRow = rows.find((row) => row["Source Row"] === "session_a_1");
  const arrearRow = rows.find((row) => row["Source Row"] === "arrear_b_1");

  assert.match(sessionRow["Collision Risk"], /arrear_b_1/);
  assert.match(arrearRow["Collision Risk"], /session_a_1/);
  assert.equal(sessionRow.Result, "PASS");
  assert.equal(arrearRow.Result, "PASS");
});

test("missing company id blocks backfill reconciliation", () => {
  const badFixture = {
    ...fixture,
    rows: [{ ...fixture.rows[0], company_id: "" }]
  };
  const rows = createTenantScopeBackfillRows(badFixture);
  const summary = summarizeTenantScopeBackfillRows(rows);

  assert.equal(summary.overall, "BLOCKED");
  assert.equal(rows[0].Result, "BLOCKED");
  assert.match(rows[0].Notes, /missing company_id/);
});

test("unknown property id blocks backfill reconciliation", () => {
  const badFixture = {
    ...fixture,
    rows: [{ ...fixture.rows[0], property_id: "property_missing" }]
  };
  const rows = createTenantScopeBackfillRows(badFixture);

  assert.equal(rows[0].Result, "BLOCKED");
  assert.match(rows[0].Notes, /unknown property_id/);
});

test("summary reports collision warnings and blocks bad rows", () => {
  const rows = [
    ...createTenantScopeBackfillRows(fixture),
    {
      "Source Row": "bad",
      Table: "sessions",
      "Legacy CORPID": "homelink",
      Bed: "999",
      CID: "CID-BAD",
      "Candidate Company": "missing",
      "Candidate Property": "missing",
      "Mapping Status": "BLOCKED",
      "Collision Risk": "none",
      Result: "BLOCKED",
      Notes: "missing company_id, missing property_id"
    }
  ];
  const summary = summarizeTenantScopeBackfillRows(rows);

  assert.equal(summary.overall, "BLOCKED");
  assert.equal(summary.blockedCount, 1);
  assert.equal(summary.collisionWarningCount, 2);
});

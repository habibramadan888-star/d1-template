import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTenantScopeStagingBackfillRows,
  summarizeTenantScopeStagingBackfillRows
} from "../scripts/dry-run-tenant-scope-staging-backfill.mjs";

function schema(name, sql) {
  return { name, sql };
}

test("scoped staging table with complete company/property values requires no update", () => {
  const rows = buildTenantScopeStagingBackfillRows({
    schemaRows: [
      schema(
        "sessions",
        "CREATE TABLE sessions (id TEXT PRIMARY KEY, company_id TEXT, property_id TEXT, corpid TEXT)"
      )
    ],
    counts: {
      sessions: {
        total: 2,
        legacyCorpidRows: 2,
        missingCompanyRows: 0,
        missingPropertyRows: 0
      }
    }
  });

  assert.equal(rows[0].Result, "PASS");
  assert.equal(rows[0]["Draft Update Plan"], "NO_UPDATE_REQUIRED");
});

test("scoped staging table with missing company/property values requires manual review", () => {
  const rows = buildTenantScopeStagingBackfillRows({
    schemaRows: [
      schema(
        "transactions",
        "CREATE TABLE transactions (id TEXT PRIMARY KEY, company_id TEXT, property_id TEXT)"
      )
    ],
    counts: {
      transactions: {
        total: 3,
        legacyCorpidRows: 0,
        missingCompanyRows: 1,
        missingPropertyRows: 0
      }
    }
  });

  assert.equal(rows[0].Result, "MANUAL_REQUIRED");
  assert.equal(rows[0]["Draft Update Plan"], "MANUAL_REVIEW_REQUIRED_BEFORE_BACKFILL");
});

test("legacy corpid-only staging table stays warning-only with no generated write", () => {
  const rows = buildTenantScopeStagingBackfillRows({
    schemaRows: [schema("arrears", "CREATE TABLE arrears (id TEXT PRIMARY KEY, corpid TEXT)")],
    counts: {
      arrears: {
        total: 4,
        legacyCorpidRows: 4,
        missingCompanyRows: 0,
        missingPropertyRows: 0
      }
    }
  });

  assert.equal(rows[0].Result, "LEGACY_WARNING");
  assert.equal(rows[0]["Draft Update Plan"], "DRAFT_BACKFILL_REQUIRED_AFTER_SCHEMA_APPROVAL");
});

test("unscoped non-empty staging table requires manual review before backfill", () => {
  const rows = buildTenantScopeStagingBackfillRows({
    schemaRows: [schema("audit_logs", "CREATE TABLE audit_logs (id TEXT PRIMARY KEY)")],
    counts: {
      audit_logs: {
        total: 1,
        legacyCorpidRows: 0,
        missingCompanyRows: 0,
        missingPropertyRows: 0
      }
    }
  });

  assert.equal(rows[0].Result, "MANUAL_REQUIRED");
  assert.match(rows[0].Notes, /Manual mapping/);
});

test("summary passes dry-run when only manual review and legacy warnings remain", () => {
  const rows = [
    {
      Result: "PASS",
      "Draft Update Plan": "NO_UPDATE_REQUIRED"
    },
    {
      Result: "MANUAL_REQUIRED",
      "Draft Update Plan": "MANUAL_REVIEW_REQUIRED_BEFORE_BACKFILL"
    },
    {
      Result: "LEGACY_WARNING",
      "Draft Update Plan": "DRAFT_BACKFILL_REQUIRED_AFTER_SCHEMA_APPROVAL"
    }
  ];
  const summary = summarizeTenantScopeStagingBackfillRows(rows);

  assert.equal(summary.overall, "PASS");
  assert.equal(summary.manualRequiredCount, 1);
  assert.equal(summary.legacyWarningCount, 1);
  assert.equal(summary.proposedWritePlanCount, 2);
});

test("summary blocks dry-run if any row is explicitly blocked", () => {
  const summary = summarizeTenantScopeStagingBackfillRows([
    {
      Result: "BLOCKED",
      "Draft Update Plan": "NO_UPDATE_ALLOWED"
    }
  ]);

  assert.equal(summary.overall, "BLOCKED");
  assert.equal(summary.blockedCount, 1);
});

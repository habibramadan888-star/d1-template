import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  FEATURE_FLAGS,
  getFeatureFlag,
  getFeatureFlagSnapshot,
  parseBooleanFlag
} from "../../deploy-worker/src/config/feature-flags.js";

describe("P0 Infrastructure: Feature Flags and Core Migration", () => {
  it("keeps all feature flags disabled by default", () => {
    for (const flagName of Object.keys(FEATURE_FLAGS)) {
      assert.equal(getFeatureFlag({}, flagName), false);
    }
  });

  it("parses common boolean flag representations", () => {
    assert.equal(parseBooleanFlag("true"), true);
    assert.equal(parseBooleanFlag("1"), true);
    assert.equal(parseBooleanFlag("on"), true);
    assert.equal(parseBooleanFlag("false", true), false);
    assert.equal(parseBooleanFlag("0", true), false);
    assert.equal(parseBooleanFlag(undefined, true), true);
  });

  it("reports a full feature flag snapshot", () => {
    const snapshot = getFeatureFlagSnapshot({
      FF_BACKEND_TOTALS: "true",
      FF_RECEIVABLES_STATE: "false"
    });

    assert.equal(snapshot.BACKEND_TOTALS_AUTHORITY_ENABLED, true);
    assert.equal(snapshot.RECEIVABLES_STATE_MACHINE_ENABLED, false);
    assert.equal(snapshot.TENANT_ISOLATION_ENABLED, false);
    assert.equal(snapshot.AUDIT_TRAIL_ENABLED, false);
  });

  it("adds core schema migration with D1-compatible one-time ALTER statements", async () => {
    const sql = await readFile("migrations/001-core-schema.sql", "utf8");

    assert.match(sql, /CREATE TABLE IF NOT EXISTS receivables_ledger/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS idempotency_keys/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS audit_logs/);
    assert.match(sql, /ALTER TABLE receivables ADD COLUMN status TEXT DEFAULT 'PENDING'/);
    assert.doesNotMatch(sql, /ADD COLUMN IF NOT EXISTS/i);
  });
});

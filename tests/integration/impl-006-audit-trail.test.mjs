import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeAuditContext,
  queryAuditLogs,
  recordAuditLog,
  redactSensitiveValues
} from "../../deploy-worker/src/audit/logger.js";

describe("IMPL-006: Audit Trail", () => {
  it("normalizes audit context and records a row", async () => {
    const calls = [];
    const db = {
      async query(sql, params) {
        calls.push({ sql, params });
        return [];
      }
    };

    const result = await recordAuditLog(db, {
      operationType: "INSERT",
      resourceType: "entry",
      resourceId: "entry-1",
      userId: "user-1",
      newValue: { amount: 15050 },
      status: "SUCCESS"
    });

    assert.equal(result.ok, true);
    assert.match(calls[0].sql, /INSERT INTO audit_logs/);
    assert.equal(calls[0].params[0], "INSERT");
    assert.equal(calls[0].params[1], "entry");
  });

  it("redacts sensitive values before serialization", () => {
    assert.deepEqual(
      redactSensitiveValues({
        amount: 100,
        password: "secret",
        nested: { authToken: "token-value", ok: true }
      }),
      {
        amount: 100,
        password: "[REDACTED]",
        nested: { authToken: "[REDACTED]", ok: true }
      }
    );
  });

  it("supports snake_case context aliases", () => {
    const entry = normalizeAuditContext({
      operation_type: "UPDATE",
      resource_type: "payment",
      user_id: "user-1"
    });

    assert.equal(entry.operationType, "UPDATE");
    assert.equal(entry.resourceType, "payment");
    assert.equal(entry.userId, "user-1");
  });

  it("queries audit logs by resource id with bounded limit", async () => {
    const calls = [];
    const db = {
      async query(sql, params) {
        calls.push({ sql, params });
        return [{ resource_id: "entry-1" }];
      }
    };

    const logs = await queryAuditLogs(db, "entry-1", 50000);
    assert.equal(logs.length, 1);
    assert.match(calls[0].sql, /FROM audit_logs/);
    assert.deepEqual(calls[0].params, ["entry-1", 10000]);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { verifySchema } from "../../deploy-worker/src/db/schema-verify.js";

describe("IMPL-005: Runtime DDL Cleanup", () => {
  it("passes when all required tables are present", async () => {
    const db = {
      async query(sql, params) {
        return [{ name: params[0] }];
      }
    };

    assert.deepEqual(await verifySchema(db, ["entries", "payments"]), {
      ok: true,
      verifiedTables: ["entries", "payments"]
    });
  });

  it("fails clearly when required tables are missing", async () => {
    const db = {
      async query(sql, params) {
        return params[0] === "entries" ? [{ name: "entries" }] : [];
      }
    };

    await assert.rejects(
      () => verifySchema(db, ["entries", "payments"]),
      /Missing required tables/
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendScopeFilter,
  buildScopeFilter,
  normalizeAllowedProperties
} from "../../deploy-worker/src/db/query-filters.js";

describe("IMPL-003: Tenant/Property Isolation", () => {
  it("scopes employees by tenant and assigned property IDs", () => {
    const filter = buildScopeFilter({
      role: "employee",
      tenant_id: "tenant-a",
      allowed_properties: ["101", "102"]
    });

    assert.equal(filter.clause, "tenant_id = ? AND property_id IN (?, ?)");
    assert.deepEqual(filter.params, ["tenant-a", "101", "102"]);
  });

  it("scopes owners by tenant without property restriction", () => {
    const filter = buildScopeFilter({ role: "owner", tenant_id: "tenant-a" });

    assert.equal(filter.clause, "tenant_id = ?");
    assert.deepEqual(filter.params, ["tenant-a"]);
  });

  it("denies employees with no allowed properties", () => {
    const filter = buildScopeFilter({ role: "employee", tenant_id: "tenant-a" });

    assert.equal(filter.clause, "1 = 0");
    assert.equal(filter.reason, "no_allowed_properties");
  });

  it("appends scoped WHERE before ORDER BY while preserving parameter order", () => {
    const query = appendScopeFilter("SELECT * FROM entries ORDER BY created_at DESC", {
      role: "employee",
      tenant_id: "tenant-a",
      allowed_properties: "101, 102"
    });

    assert.match(query.sql, /WHERE \(tenant_id = \? AND property_id IN \(\?, \?\)\) ORDER BY/);
    assert.deepEqual(query.params, ["tenant-a", "101", "102"]);
  });

  it("normalizes property lists from strings and arrays", () => {
    assert.deepEqual(normalizeAllowedProperties({ allowed_properties: "101, 102" }), [
      "101",
      "102"
    ]);
    assert.deepEqual(normalizeAllowedProperties({ allowed_properties: [101, "102"] }), [
      "101",
      "102"
    ]);
  });
});

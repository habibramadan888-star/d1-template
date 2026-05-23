import assert from "node:assert/strict";
import test from "node:test";

import { createEmployeeEntryIdempotencyKey } from "../modules/employees/idempotency.mjs";

const base = {
  companyId: "co_1",
  propertyId: "prop_1",
  sessionId: "sess_1",
  operatorId: "staff_1",
  clientEntryId: "client_entry_1"
};

test("createEmployeeEntryIdempotencyKey creates stable scoped keys", () => {
  const first = createEmployeeEntryIdempotencyKey(base);
  const second = createEmployeeEntryIdempotencyKey({ ...base });

  assert.equal(first.key, second.key);
  assert.match(first.key, /^emp_entry_[a-f0-9]{64}$/);
  assert.deepEqual(first.scope, base);
});

test("createEmployeeEntryIdempotencyKey changes when any isolation anchor changes", () => {
  const original = createEmployeeEntryIdempotencyKey(base).key;
  const variants = [
    { ...base, companyId: "co_2" },
    { ...base, propertyId: "prop_2" },
    { ...base, sessionId: "sess_2" },
    { ...base, operatorId: "staff_2" },
    { ...base, clientEntryId: "client_entry_2" }
  ];

  for (const variant of variants) {
    assert.notEqual(createEmployeeEntryIdempotencyKey(variant).key, original);
  }
});

test("createEmployeeEntryIdempotencyKey trims values and rejects missing anchors", () => {
  const key = createEmployeeEntryIdempotencyKey({
    companyId: " co_1 ",
    propertyId: " prop_1 ",
    sessionId: " sess_1 ",
    operatorId: " staff_1 ",
    clientEntryId: " client_entry_1 "
  });

  assert.deepEqual(key.scope, base);
  assert.throws(
    () => createEmployeeEntryIdempotencyKey({ ...base, clientEntryId: "" }),
    /clientEntryId/
  );
  assert.throws(() => createEmployeeEntryIdempotencyKey(null), /object/);
});

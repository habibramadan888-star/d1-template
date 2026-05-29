import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  STATES,
  assertValidTransition,
  isValidTransition,
  transitionReceivable
} from "../../deploy-worker/src/business/receivables-state-machine.js";

describe("IMPL-002: Receivables State Machine", () => {
  it("allows documented valid transitions and rejects invalid transitions", () => {
    assert.equal(isValidTransition(STATES.CREATED, STATES.PENDING), true);
    assert.equal(isValidTransition(STATES.PENDING, STATES.PARTIAL), true);
    assert.equal(isValidTransition(STATES.PARTIAL, STATES.PAID), true);
    assert.equal(isValidTransition(STATES.PAID, STATES.PENDING), false);
    assert.throws(() => assertValidTransition(STATES.PAID, STATES.PENDING));
  });

  it("requires approval for adjusted and written-off transitions", () => {
    assert.throws(() => assertValidTransition(STATES.PENDING, STATES.ADJUSTED));
    assert.throws(() => assertValidTransition(STATES.PENDING, STATES.WRITTEN_OFF));
    assert.doesNotThrow(() =>
      assertValidTransition(STATES.PENDING, STATES.ADJUSTED, { approvedBy: "finance-1" })
    );
  });

  it("updates receivable state and writes a ledger entry atomically", async () => {
    const calls = [];
    const db = {
      async query(sql, params) {
        calls.push({ sql, params });
        if (/SELECT \*/.test(sql)) {
          return [{ id: "rec-1", status: STATES.PENDING, amount: 1000, outstanding_amount: 1000 }];
        }
        return [];
      }
    };

    const result = await transitionReceivable(db, "rec-1", STATES.PARTIAL, {
      allocatedAmount: 500,
      reason: "Payment allocation"
    });

    assert.deepEqual(result, {
      success: true,
      receivableId: "rec-1",
      oldState: STATES.PENDING,
      newState: STATES.PARTIAL
    });
    assert(calls.some((call) => /BEGIN IMMEDIATE TRANSACTION/.test(call.sql)));
    assert(calls.some((call) => /INSERT INTO receivables_ledger/.test(call.sql)));
    assert(calls.some((call) => /COMMIT/.test(call.sql)));
  });
});

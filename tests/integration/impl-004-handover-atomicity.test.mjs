import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateHandoverTotals,
  validateHandoverBody
} from "../../deploy-worker/src/handlers/handover.js";

describe("IMPL-004: Handover Atomicity", () => {
  it("calculates backend cash and bank totals from entry rows", () => {
    assert.deepEqual(
      calculateHandoverTotals([
        { id: "e1", method: "CASH", amount: 100 },
        { id: "e2", method: "BANK", amount: 250 },
        { id: "e3", method: "BANK_TRANSFER", amount: 50 }
      ]),
      { totalCash: 100, totalBank: 300 }
    );
  });

  it("validates entries and reported totals as integer minor units", () => {
    const entries = validateHandoverBody({
      totalCash: 100,
      totalBank: 250,
      entries: [{ id: "e1", method: "CASH", amount: 100 }]
    });

    assert.equal(entries.length, 1);
    assert.throws(() => validateHandoverBody({ totalCash: 1.5, totalBank: 0, entries: [] }));
    assert.throws(() =>
      validateHandoverBody({
        totalCash: 100,
        totalBank: 0,
        entries: [{ method: "CASH", amount: 100 }]
      })
    );
  });
});

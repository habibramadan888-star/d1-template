import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computePaymentTotals,
  countRows,
  createDashboardTotalsPayload
} from "../../deploy-worker/src/handlers/dashboard-totals.js";

describe("IMPL-001: Backend Totals Authority", () => {
  it("computes cash, bank, and collected totals from backend rows", () => {
    assert.deepEqual(
      computePaymentTotals([
        { method: "CASH", total: 15050 },
        { method: "BANK", total: 20025 },
        { method: "BANK_TRANSFER", total: 300 }
      ]),
      {
        totalCash: 15050,
        totalBank: 20325,
        totalCollected: 35375
      }
    );
  });

  it("builds response with computation version, duration, rowsChecked, and audit metadata", () => {
    const payload = createDashboardTotalsPayload({
      paymentRows: [{ method: "CASH", total: 100 }],
      receivablesRow: { totalOutstanding: 25, totalOverdue: 10 },
      rowsChecked: { payments: 2, receivables: 3 },
      user: { id: "owner-1" },
      computationId: "comp-1",
      startedAt: Date.now(),
      now: "2026-05-30T09:00:00.000Z"
    });

    assert.equal(payload.computation.version, "1.0");
    assert.equal(payload.computation.timestamp, "2026-05-30T09:00:00.000Z");
    assert.equal(payload.computation.rowsChecked.payments, 2);
    assert.equal(payload.audit.computationId, "comp-1");
    assert.equal(payload.data.totalCollected, 100);
    assert.equal(payload.data.currency, "AED");
    assert.equal(payload.data.precision, "fils");
  });

  it("counts rows with tenant parameterization and rejects unsupported table names", async () => {
    const calls = [];
    const db = {
      async query(sql, params) {
        calls.push({ sql, params });
        return [{ count: 42 }];
      }
    };

    assert.equal(await countRows(db, "payments", "tenant-1", "owner"), 42);
    assert.deepEqual(calls[0].params, ["tenant-1"]);
    await assert.rejects(() => countRows(db, "payments; DROP TABLE users", "tenant-1", "owner"));
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BACKEND_TOTALS_STAGING_FLAG,
  backendTotalsStagingScopeRows,
  classifyTotalScope,
  compareAedTotals,
  createComparisonRowsFromData,
  resolveBackendTotalsStagingMode
} from "../scripts/compare-staging-backend-totals.mjs";
import {
  compareFrontendTotalsToBackend,
  computeSessionTotalsFils
} from "../modules/finance/backend-totals.mjs";

test("production env disables backend totals switch even when flag is true", () => {
  const mode = resolveBackendTotalsStagingMode({
    APP_ENV: "production",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.mode, "LEGACY");
  assert.equal(mode.productionDisabled, true);
  assert.equal(mode.responseMutationAllowed, false);
});

test("flag off uses legacy behavior in staging and rollback", () => {
  const mode = resolveBackendTotalsStagingMode({
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "false"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.mode, "LEGACY");
  assert.equal(mode.reason, "flag_off_or_env_not_allowed");
});

test("flag on staging allows shadow candidate computation without response mutation", () => {
  const mode = resolveBackendTotalsStagingMode({
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });

  assert.equal(mode.enabled, true);
  assert.equal(mode.mode, "SHADOW_COMPARE");
  assert.equal(mode.responseMutationAllowed, false);
});

test("voided records are excluded in staging comparison candidates", () => {
  const rows = [
    { id: "active", type: "R", cat: "cash", amount: "100.00" },
    { id: "voided", type: "R", cat: "cash", amount: "900.00", voided_at: "2026-05-25" }
  ];
  const totals = computeSessionTotalsFils(rows, {
    frontendTotals: {
      cash_handover: "100.00",
      gross_received: "100.00",
      bank_transfer_total: "0.00",
      bank_transfer_count: 0
    }
  });

  assert.equal(totals.cashHandoverFils, 10000n);
  assert.equal(totals.excludedVoidedRowCount, 1);
  assert.equal(totals.comparison.matches, true);
});

test("staging-only receivables rehearsal rows are excluded from backend totals comparison", () => {
  const comparisonRows = createComparisonRowsFromData({
    transactions: [
      {
        id: "p0_008e_voided_payment",
        session_id: "p0_008e_shadow_session",
        corpid: "p0-008e-shadow",
        type: "R",
        cat: "rent",
        amount: "450.00",
        src: "P0-008E_RECEIVABLES_SHADOW_REHEARSAL",
        voided_at: "2026-05-25T12:00:00.000Z"
      }
    ],
    sessions: [],
    arrearRows: []
  });
  const rentReceived = comparisonRows.find((row) => row.Scenario === "rent received");
  const excludedRows = comparisonRows.find(
    (row) => row.Scenario === "staging-only receivables rehearsal rows"
  );

  assert.equal(rentReceived.Delta, "0.00");
  assert.equal(rentReceived.Status, "MATCH");
  assert.equal(excludedRows["Current / Legacy Total"], "1 excluded rows");
  assert.equal(excludedRows.Status, "MATCH");
});

test("frontend totals are not accounting authority", () => {
  const backend = computeSessionTotalsFils([
    { id: "cash", type: "R", cat: "cash", amount: "80.00" }
  ]);
  const comparison = compareFrontendTotalsToBackend(
    {
      cash_handover: "999.00",
      gross_received: "999.00",
      bank_transfer_total: "0.00",
      bank_transfer_count: 0
    },
    backend
  );

  assert.equal(comparison.matches, false);
  assert.equal(backend.cashHandoverFils, 8000n);
});

test("legacy decimal warning is handled as warning, not production authority", () => {
  const comparisonRows = createComparisonRowsFromData({
    transactions: [{ id: "legacy", session_id: "s1", type: "R", cat: "cash", amount: 80 }],
    sessions: [
      {
        id: "s1",
        cash_handover: "80.00",
        bank_transfer_total: "0.00",
        bank_transfer_count: 0,
        gross_received: "80.00"
      }
    ],
    arrearRows: []
  });
  const warning = comparisonRows.find((row) => row.Scenario === "legacy decimal / fils conversion");

  assert.equal(warning.Status, "LEGACY_WARNING");
});

test("delta detection works", () => {
  const delta = compareAedTotals("99.00", 8000n);

  assert.equal(delta.status, "MISMATCH");
  assert.equal(delta.deltaAed, "19.00");
});

test("P0-008 blocked totals are not switched", () => {
  assert.equal(classifyTotalScope("arrears outstanding"), "BLOCKED_BY_P0_008");
  assert.equal(classifyTotalScope("dashboard overdue amount"), "BLOCKED_BY_P0_008");
});

test("P0-006 blocked totals remain production no-go through scope rows", () => {
  const rows = backendTotalsStagingScopeRows();
  const productionSwitchable = rows.filter((row) => row.canProductionSwitch);

  assert.equal(productionSwitchable.length, 0);
  assert.ok(rows.some((row) => row.blocker === "PRODUCTION_NO_GO"));
});

test("P0-001 unresolved totals are not switched", () => {
  assert.equal(classifyTotalScope("dashboard monthly income"), "BLOCKED_BY_P0_001");
  assert.equal(classifyTotalScope("history row totals"), "BLOCKED_BY_P0_001");
});

test("no API response mutation unless an explicit future staging switch mode exists", () => {
  const mode = resolveBackendTotalsStagingMode({
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });

  assert.equal(mode.mode, "SHADOW_COMPARE");
  assert.equal(mode.responseMutationAllowed, false);
});

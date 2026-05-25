import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BACKEND_TOTALS_STAGING_FLAG,
  backendTotalsStagingScopeRows,
  createBackendTotalsStagingSwitchRows,
  resolveBackendTotalsStagingMode,
  summarizeBackendTotalsStagingSwitchRows
} from "../scripts/compare-staging-backend-totals.mjs";
import {
  compareFrontendTotalsToBackend,
  computeDashboardTotalsFils,
  computeSessionTotalsFils
} from "../modules/finance/backend-totals.mjs";

const comparisonRows = [
  {
    Scenario: "cash total",
    "Current / Legacy Total": "80.00",
    "Backend Authority Candidate": "80.00",
    Delta: "0.00",
    Status: "MATCH",
    Notes: "cash candidate"
  },
  {
    Scenario: "bank transfer count",
    "Current / Legacy Total": "0",
    "Backend Authority Candidate": "0",
    Delta: "0",
    Status: "MATCH",
    Notes: "bank count candidate"
  },
  {
    Scenario: "rent received",
    "Current / Legacy Total": "80.00",
    "Backend Authority Candidate": "80.00",
    Delta: "0.00",
    Status: "MATCH",
    Notes: "rent candidate"
  },
  {
    Scenario: "session totals: staging-session",
    "Current / Legacy Total": "cash 80 / bank 0 / gross 80",
    "Backend Authority Candidate": "cash 80.00 / bank 0.00 / gross 80.00",
    Delta: "0.00",
    Status: "LEGACY_WARNING",
    Notes: "session candidate"
  },
  {
    Scenario: "voided records exclusion",
    "Current / Legacy Total": "1 excluded rows",
    "Backend Authority Candidate": "active totals exclude voided rows",
    Delta: "0.00",
    Status: "MATCH",
    Notes: "void candidate"
  },
  {
    Scenario: "active records totals",
    "Current / Legacy Total": "1 included rows",
    "Backend Authority Candidate": "1 active rows",
    Delta: "0.00",
    Status: "MATCH",
    Notes: "active candidate"
  },
  {
    Scenario: "arrears outstanding",
    "Current / Legacy Total": "0.00",
    "Backend Authority Candidate": "0.00",
    Delta: "0.00",
    Status: "BLOCKED",
    Notes: "P0-008 blocked"
  },
  {
    Scenario: "dashboard monthly income",
    "Current / Legacy Total": "MANUAL_REQUIRED",
    "Backend Authority Candidate": "read-only candidate",
    Delta: "0.00",
    Status: "MANUAL_REQUIRED",
    Notes: "P0-001 blocked"
  },
  {
    Scenario: "history row totals",
    "Current / Legacy Total": "MANUAL_REQUIRED",
    "Backend Authority Candidate": "shadow candidate",
    Delta: "0.00",
    Status: "MANUAL_REQUIRED",
    Notes: "P0-001 blocked"
  }
];

test("production plus flag true is disabled and legacy", () => {
  const mode = resolveBackendTotalsStagingMode({
    APP_ENV: "production",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.mode, "LEGACY");
  assert.equal(mode.productionDisabled, true);
});

test("staging plus flag false keeps legacy behavior", () => {
  const rows = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "false"
  });

  assert.ok(rows.every((row) => row.Mode === "LEGACY"));
  assert.ok(rows.every((row) => row.Result === "LEGACY"));
});

test("staging plus flag true enables backend totals staging mode for approved candidates", () => {
  const rows = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });
  const switched = rows.filter((row) => row.Mode === "BACKEND_TOTALS_STAGING");

  assert.deepEqual(
    switched.map((row) => row.Scenario),
    [
      "cash total",
      "bank transfer count",
      "rent received",
      "session totals: staging-session",
      "voided records exclusion",
      "active records totals"
    ]
  );
});

test("approved candidate totals use backend authority candidate", () => {
  const rows = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });
  const cash = rows.find((row) => row.Scenario === "cash total");

  assert.equal(cash.Mode, "BACKEND_TOTALS_STAGING");
  assert.equal(cash["Backend Total"], "80.00");
  assert.equal(cash.Result, "PASS");
});

test("blocked P0-008 totals stay shadow-only", () => {
  const rows = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });
  const arrears = rows.find((row) => row.Scenario === "arrears outstanding");

  assert.equal(arrears.Mode, "SHADOW_ONLY");
  assert.equal(arrears.Result, "SHADOW_ONLY");
  assert.match(arrears.Notes, /BLOCKED_BY_P0_008/);
});

test("P0-001 blocked totals stay shadow-only", () => {
  const rows = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });

  for (const scenario of ["dashboard monthly income", "history row totals"]) {
    const row = rows.find((item) => item.Scenario === scenario);
    assert.equal(row.Mode, "SHADOW_ONLY");
    assert.equal(row.Result, "SHADOW_ONLY");
    assert.match(row.Notes, /BLOCKED_BY_P0_001/);
  }
});

test("P0-006 keeps all production switches disabled", () => {
  assert.equal(
    backendTotalsStagingScopeRows().some((row) => row.canProductionSwitch),
    false
  );
});

test("voided records are excluded from active totals", () => {
  const totals = computeSessionTotalsFils([
    { id: "active", type: "R", cat: "cash", amount: "80.00" },
    { id: "voided", type: "R", cat: "cash", amount: "800.00", voided_at: "2026-05-25" }
  ]);

  assert.equal(totals.cashHandoverFils, 8000n);
  assert.equal(totals.excludedVoidedRowCount, 1);
});

test("active records totals are correct", () => {
  const totals = computeDashboardTotalsFils([
    { id: "rent", type: "R", cat: "cash", amount: "80.00" },
    { id: "voided", type: "R", cat: "cash", amount: "20.00", voided_at: "2026-05-25" }
  ]);

  assert.equal(totals.includedRowCount, 1);
  assert.equal(totals.grossReceivedFils, 8000n);
});

test("frontend totals are not authority", () => {
  const backend = computeSessionTotalsFils([
    { id: "rent", type: "R", cat: "cash", amount: "80.00" }
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

test("rollback flag false restores legacy behavior", () => {
  const flagOn = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });
  const flagOff = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "false"
  });

  assert.ok(flagOn.some((row) => row.Mode === "BACKEND_TOTALS_STAGING"));
  assert.ok(flagOff.every((row) => row.Mode === "LEGACY"));
});

test("dashboard and history do not show unapproved changes", () => {
  const rows = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });

  assert.equal(rows.find((row) => row.Scenario === "dashboard monthly income").Mode, "SHADOW_ONLY");
  assert.equal(rows.find((row) => row.Scenario === "history row totals").Mode, "SHADOW_ONLY");
});

test("pure rehearsal helper does not call production URL or write production D1", () => {
  const rows = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });
  const summary = summarizeBackendTotalsStagingSwitchRows(rows);

  assert.equal(summary.unexpectedSwitchCount, 0);
  assert.equal(summary.overall, "PASS");
});

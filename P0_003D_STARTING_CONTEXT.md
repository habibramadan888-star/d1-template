# P0-003D Starting Context

Generated: 2026-05-25

Scope: backend totals authority staging switch gate. This context is read-only
and does not switch dashboard output, mutate API responses, deploy production,
migrate production, or write production/staging D1 data.

## Inputs Reviewed

| File / Source                                   | Status   | Notes                                                                                                                                         |
| ----------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`             | Reviewed | Defines backend totals rules, void exclusions, integer-fils authority, and frontend-submitted totals as comparison data only.                 |
| `BACKEND_TOTALS_AUTHORITY_REHEARSAL_RESULT.md`  | Reviewed | Local rehearsal passed with expected tamper/void mismatch evidence and legacy warnings.                                                       |
| `BACKEND_TOTALS_AUTHORITY_GATE.md`              | Reviewed | Production switch gate remains unsatisfied; staging comparison and human review required.                                                     |
| `BACKEND_TOTALS_EDGE_CASE_REPORT.md`            | Reviewed | Edge cases cover invalid money, voided rows, frontend tamper, legacy decimals, and multi-session dashboard fixtures.                          |
| `modules/finance/backend-totals.mjs`            | Reviewed | Provides backend authority candidates for session, dashboard, cash, bank, gross, rent, deposit, arrears paid, and arrears outstanding totals. |
| `tests/backend-totals-authority.spec.mjs`       | Reviewed | Covers core backend totals behavior and discrepancy detection.                                                                                |
| `scripts/rehearse-backend-totals-authority.mjs` | Reviewed | Local-only D1 rehearsal; no production or remote D1 operations.                                                                               |
| `MONEY_DUAL_WRITE_READINESS_GATE.md`            | Missing  | Closest current gates are `MONEY_DUAL_WRITE_GO_LIVE_GATE.md` and `MONEY_DUAL_WRITE_MIGRATION_REVIEW.md`.                                      |
| `MONEY_RECONCILIATION_GATE_RESULT.md`           | Reviewed | Overall remains `MANUAL_REQUIRED`; no FAIL or BLOCKED result.                                                                                 |
| `STAGING_QA_006_EVIDENCE_LOCK.md`               | Reviewed | Real staging employee entry and handover evidence is locked.                                                                                  |
| `STAGING_QA_006_PRODUCTION_NO_GO_REVIEW.md`     | Reviewed | Production remains `NO-GO`.                                                                                                                   |
| `STAGING_QA_005_DATABASE_EVIDENCE.md`           | Reviewed | Staging QA wrote one employee session/transaction and handover staging rows; invalid writes did not mutate financial tables.                  |
| `STAGING_QA_005_OWNER_FLOW_EVIDENCE.md`         | Reviewed | Owner history showed expected staging legacy write change.                                                                                    |
| `COMMERCIALIZATION_BACKLOG.md`                  | Reviewed | P0-003 remains a production blocker.                                                                                                          |
| `P0_P1_STATUS_REVIEW.md`                        | Reviewed | P0-003 status is Partial, not Verified.                                                                                                       |

## Backend Authority Helper Coverage

| Total Area                | Backend Helper Coverage                                                          | Current Gate Position                                                                  |
| ------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Cash total                | `computeCashTotalFils`, `computeSessionTotalsFils`, `computeDashboardTotalsFils` | Can shadow compare and can enter staging switch rehearsal.                             |
| Bank transfer total/count | `computeBankTransferTotalFils`, `computeSessionTotalsFils`                       | Can shadow compare and can enter staging switch rehearsal.                             |
| Gross received            | `computeGrossReceivedFils`, `computeSessionTotalsFils`                           | Can shadow compare; KPI definition still needs human review before production.         |
| Rent received             | `computeDashboardTotalsFils`                                                     | Can shadow compare and can enter staging switch rehearsal.                             |
| Deposit total             | `computeDepositTotalFils`                                                        | Shadow only; production authority depends on deposit liability and receivables review. |
| Arrears paid              | `computeArrearsPaidFils` via dashboard/session totals                            | Shadow only; final authority depends on P0-008 payment allocation.                     |
| Arrears outstanding       | `computeArrearsOutstandingFils`                                                  | Shadow only; final authority blocked by P0-008 receivables.                            |
| Handover totals           | Handover helper and staging endpoint backend totals                              | Can shadow compare and can enter staging switch rehearsal for staging only.            |
| Session totals            | `computeSessionTotalsFils`                                                       | Can shadow compare and can enter staging switch rehearsal.                             |
| Voided records exclusion  | Built into backend totals helpers                                                | Can shadow compare and can enter staging switch rehearsal.                             |

## Still Legacy / Frontend / SQL Aggregated

| Area                           | Current Source                                              | Reason Not Live-Switched                                                      |
| ------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Owner dashboard monthly income | Legacy dashboard/browser and existing API response behavior | Needs dashboard evidence, KPI definition, and P0-001 reconciliation.          |
| Today due / overdue            | Legacy due-date and arrears logic                           | Final authority depends on P0-008 receivables.                                |
| History row totals             | Legacy row display                                          | Display-only until minor-unit write/backfill and reconciliation are complete. |
| Arrears outstanding            | Legacy `arrears` / `arrear_tasks`                           | Final authority depends on receivables model.                                 |
| Tenant/property scoped totals  | Legacy `corpid` scope                                       | Production SaaS authority depends on P0-006.                                  |

## Staging QA Data Suitability

The current staging QA data is sufficient for a first read-only comparison of:

- Cash total.
- Bank transfer total/count.
- Gross received.
- Session totals.
- Active records.
- Voided-row exclusion behavior.
- Legacy decimal warning handling.

It is not sufficient for production-ready authority over:

- Today due.
- Overdue amount.
- Arrears outstanding.
- Deposit liability.
- Tenant/property scoped dashboard KPIs.

## P0 Dependencies

| Dependency                   | Impact                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-001 minor units           | Required before dashboard/history can rely on `*_fils` production authority. Current staging comparison still reads legacy decimal fields and emits legacy warnings. |
| P0-008 receivables           | Required before today due, overdue, arrears outstanding, short-pay, and payment allocation become final authority.                                                   |
| P0-006 tenant/property scope | Required before shared SaaS production totals can be considered safe across tenants/properties.                                                                      |

## What P0-003D Can Safely Verify

- Read-only staging D1 backend totals shadow comparison.
- Delta detection between current staging legacy totals and backend candidates.
- Whether core staging QA session totals match backend recompute.
- Whether voided rows are excluded by backend active totals.
- Whether frontend totals remain non-authoritative.
- Whether a staging-only feature flag plan can protect future switch rehearsal.

## What Cannot Switch Live

- Production dashboard totals.
- Production history row totals.
- Production arrears/overdue authority.
- Production deposit liability totals.
- Any production response under a backend totals authority flag.

Conclusion: P0-003D can proceed as a staging/local shadow gate. Production
switch remains `NO-GO`.

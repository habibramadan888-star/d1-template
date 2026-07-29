# P0-003D Backend Totals Staging Switch Gate

Generated: 2026-05-25

Scope: staging/local gate for backend totals authority. This gate does not
modify live dashboard output, live financial formulas, production Worker config,
or production D1.

## GO for staging shadow comparison

| Condition                                  | Status | Evidence                                                                                   |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------ |
| Backend totals helper exists               | GO     | `modules/finance/backend-totals.mjs`                                                       |
| Local backend totals rehearsal passes      | GO     | `BACKEND_TOTALS_AUTHORITY_REHEARSAL_RESULT.md`                                             |
| Real staging QA data exists                | GO     | `STAGING_QA_006_EVIDENCE_LOCK.md`                                                          |
| Read-only staging comparison script exists | GO     | `scripts/compare-staging-backend-totals.mjs`                                               |
| Staging comparison has no mismatch         | GO     | `STAGING_BACKEND_TOTALS_COMPARISON_RESULT.md` reports `STAGING_BACKEND_TOTALS_MISMATCH=no` |
| Production remains disabled                | GO     | `gate:commercial-launch` remains `PRODUCTION_NO_GO`                                        |

## GO for staging feature-flagged switch rehearsal

Eligible for a future P0-003E staging switch rehearsal:

- cash total
- bank transfer total/count
- gross received
- rent received
- handover totals
- session totals
- voided records exclusion
- active records totals

Required controls:

- Feature flag: `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING`
- Allowed `APP_ENV`: `development`, `dev`, `local`, `test`, `staging`
- Production: always disabled
- Flag off: existing legacy dashboard/totals behavior
- Flag on: staging shadow response or explicitly scoped staging switch response only
- Rollback: set `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING=false`
- Post-rollback validation: dashboard returns legacy behavior

## NO-GO for production switch

| NO-GO Item                                                   | Reason                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| P0-001 minor-unit reconciliation incomplete                  | Staging comparison still reads legacy decimal fields and emits legacy warnings. |
| P0-008 receivables incomplete                                | Due/overdue/arrears authority cannot be final.                                  |
| P0-006 tenant/property scope incomplete                      | Shared SaaS production totals are not tenant/property safe.                     |
| TOP_25 money risks not manually reviewed                     | Accounting risk review remains required.                                        |
| Production migration not approved                            | No production schema authority change is approved.                              |
| Production rollback not exercised                            | Staging rollback does not prove production rollback.                            |
| Dashboard/history authenticated response evidence incomplete | P0-003D read-only D1 comparison is not a live dashboard switch.                 |

## Delta Rules

| Delta                                                  | Gate Result                                                            |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `0 fils` for cash, bank, gross, and session totals     | Eligible for staging switch rehearsal.                                 |
| Non-zero delta in cash, bank, gross, or session totals | Blocks staging switch rehearsal until reviewed.                        |
| Legacy decimal warning with zero delta                 | Allowed for shadow comparison only; requires P0-001 before production. |
| Any invalid money error                                | Blocks switch rehearsal.                                               |
| Arrears/outstanding delta                              | Manual review only; production blocked until P0-008.                   |

## Human Review Required

- Accountant/product review of KPI definitions: gross received vs operating income, deposit liability, due/overdue, and arrears outstanding.
- Engineering review of authenticated dashboard/history response evidence before P0-003E.
- Human confirmation that P0-003D staging comparison rows represent the expected QA data.
- Human approval before any staging feature flag enablement.

## Gate Conclusion

P0-003 status: `Partial - backend totals staging switch gate ready`.

GO for staging shadow comparison: yes.

GO for staging feature-flagged switch rehearsal: yes, for eligible totals only.

NO-GO for production switch: yes.

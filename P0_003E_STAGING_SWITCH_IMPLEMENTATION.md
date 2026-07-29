# P0-003E Staging Switch Implementation

Generated: 2026-05-25

Scope: minimum safe staging/local backend totals switch rehearsal. This task did
not change Worker routes, dashboard output, production config, remote feature
flags, or database rows.

## Implementation

| Component                                                | Change                                                                                                        | Safety Boundary                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `scripts/compare-staging-backend-totals.mjs`             | Added switch-scope classification and staging-mode row generation.                                            | Pure helper logic plus existing read-only staging D1 comparison.            |
| `tests/backend-totals-staging-switch-rehearsal.spec.mjs` | Added production lock, flag off/on, approved totals, blocked totals, rollback, and no-production-write tests. | No external writes or deployments.                                          |
| `scripts/rehearse-backend-totals-staging-switch.mjs`     | Added staging/local switch rehearsal report generation.                                                       | Reads staging D1, runs commercial gate, does not mutate remote flags or D1. |
| `package.json`                                           | Added `test:backend-totals-staging-switch` and `rehearse:backend-totals-staging-switch`.                      | Validation only.                                                            |

## Switched In Rehearsal

| Total                       | Mode                     | Evidence                                            |
| --------------------------- | ------------------------ | --------------------------------------------------- |
| cash total                  | `BACKEND_TOTALS_STAGING` | `BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL_RESULT.md` |
| bank transfer total / count | `BACKEND_TOTALS_STAGING` | `BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL_RESULT.md` |
| gross received              | `BACKEND_TOTALS_STAGING` | `BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL_RESULT.md` |
| rent received               | `BACKEND_TOTALS_STAGING` | `BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL_RESULT.md` |
| session totals              | `BACKEND_TOTALS_STAGING` | `BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL_RESULT.md` |
| handover totals             | `BACKEND_TOTALS_STAGING` | locked STAGING-QA-006 evidence                      |
| voided records exclusion    | `BACKEND_TOTALS_STAGING` | `BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL_RESULT.md` |
| active records totals       | `BACKEND_TOTALS_STAGING` | `BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL_RESULT.md` |

## Not Switched

| Total                      | Mode                 | Blocker                        |
| -------------------------- | -------------------- | ------------------------------ |
| dashboard monthly income   | `SHADOW_ONLY`        | P0-001 reconciliation maturity |
| history row totals         | `SHADOW_ONLY`        | P0-001 reconciliation maturity |
| today due                  | legacy / shadow-only | P0-008 receivables             |
| overdue amount             | legacy / shadow-only | P0-008 receivables             |
| arrears total              | legacy / shadow-only | P0-008 receivables             |
| deposit total              | legacy / shadow-only | P0-008 receivables             |
| arrears paid / outstanding | legacy / shadow-only | P0-008 receivables             |

## Result

`BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL=PASS`.

Production remains `NO-GO`.

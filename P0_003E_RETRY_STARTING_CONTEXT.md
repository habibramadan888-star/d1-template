# P0-003E Retry Starting Context

Generated: 2026-05-25

Scope: backend totals staging switch rehearsal after FORMAT-REBASELINE-001.
This context does not approve production deploy, production migration,
production D1 writes, production feature flags, or production dashboard switch.

## Inputs Reviewed

| File / Source                                                    | Status   | Notes                                                                               |
| ---------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `P0_003D_STARTING_CONTEXT.md`                                    | reviewed | Backend totals helper coverage and P0 dependencies remain unchanged.                |
| `P0_003D_BACKEND_TOTALS_STAGING_SCOPE.md`                        | reviewed | Defines approved staging switch candidates and blocked totals.                      |
| `STAGING_BACKEND_TOTALS_COMPARISON_RESULT.md`                    | reviewed | Current staging comparison is `MANUAL_REQUIRED` with no mismatch.                   |
| `P0_003D_BACKEND_TOTALS_STAGING_SWITCH_GATE.md`                  | reviewed | Allows P0-003E staging switch rehearsal for eligible totals only.                   |
| `BACKEND_TOTALS_STAGING_FEATURE_FLAG_AND_ROLLBACK_PLAN.md`       | reviewed | Defines `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING` and rollback false.               |
| `NEXT_PROMPT_P0_003E_BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL.md` | reviewed | Confirms staging/local-only rehearsal scope.                                        |
| `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`                              | reviewed | Frontend totals are not authority; voided rows are excluded by default.             |
| `BACKEND_TOTALS_AUTHORITY_REHEARSAL_RESULT.md`                   | reviewed | Local rehearsal shows match, mismatch, void exclusion, and legacy warning evidence. |
| `modules/finance/backend-totals.mjs`                             | reviewed | Provides integer-fils backend candidates for session/dashboard totals.              |
| `STAGING_QA_006_EVIDENCE_LOCK.md`                                | reviewed | Real staging employee entry and handover evidence is locked.                        |
| `STAGING_QA_005_DATABASE_EVIDENCE.md`                            | reviewed | One valid employee session/transaction and handover staging rows exist.             |
| `STAGING_QA_005_OWNER_FLOW_EVIDENCE.md`                          | reviewed | Owner history change was expected from staging legacy write design.                 |
| `COMMERCIALIZATION_BACKLOG.md`                                   | reviewed | P0-003 remains Partial; production remains blocked.                                 |
| `P0_P1_STATUS_REVIEW.md`                                         | reviewed | P0-003 is not Verified.                                                             |

## Approved Staging Switch Rehearsal Totals

- cash total
- bank transfer total / count
- gross received
- rent received
- handover totals
- session totals
- voided records exclusion
- active records totals

## Shadow-Only Totals

- dashboard monthly income
- history row totals

## Blocked By P0-008

- dashboard today due
- dashboard overdue amount
- dashboard arrears total
- deposit total
- arrears paid
- arrears outstanding

## Blocked By P0-001 Reconciliation Maturity

- dashboard monthly income
- history row totals
- production dashboard authority using legacy decimal fields

## Blocked By P0-006

- production SaaS/tenant/property scoped backend totals
- any production switch that assumes tenant/property isolation is complete

## Staging Data Suitability

The current staging data is enough to rehearse cash, bank, bank count, gross,
rent, session totals, active-row totals, and void exclusion against one locked
staging employee-entry write. Handover totals are represented by the locked
STAGING-QA-006 evidence and are rehearsed as staging evidence, not as a live
dashboard mutation.

## Minimum Safe Implementation Scope

P0-003E uses an internal staging-mode rehearsal and read-only staging D1
comparison. It does not modify Worker routes, dashboard output, production
config, remote feature flags, or D1 data.

## Rollback

Rollback is `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING=false`. In this rehearsal,
the flag is evaluated in local script/test state only, and the final state is
false.

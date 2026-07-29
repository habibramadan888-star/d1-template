# P0-001F Live Write Path Switch Gate

Generated: 2026-05-24, Asia/Dubai

Scope: review gate only. This gate does not switch live writes to minor units and does not approve production migration.

## Gate Status

| Item                                      | Status | Evidence                                                                  |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Live write paths identified               | PASS   | `MONEY_LIVE_WRITE_PATH_AUDIT.md`, `MONEY_LIVE_WRITE_PATH_AUDIT_RESULT.md` |
| Static money write audit available        | PASS   | `npm run audit:money-live-writes`                                         |
| Local/staging dual-write rehearsal passed | PASS   | `P0_001E_LOCAL_STAGING_DUAL_WRITE_REHEARSAL_RESULT.md`                    |
| Production migration approved             | NO     | Not in scope and not executed.                                            |
| Live write path switched                  | NO     | Not in scope and not performed.                                           |
| Dashboard switched to `*_fils`            | NO     | Not in scope and not performed.                                           |
| Live employee handover switched           | NO     | Not in scope and not performed.                                           |

## GO For P0-001G Local/Staging Write Adapter Rehearsal

P0-001G can start if all conditions below remain true:

| Condition                                         | Required Result           |
| ------------------------------------------------- | ------------------------- |
| `npm run check`                                   | PASS                      |
| `npm run audit:money-live-writes`                 | PASS and report generated |
| `npm run test:money-dual-write-local-staging`     | PASS                      |
| `npm run rehearse:money-dual-write-local-staging` | PASS                      |
| `npm run security:secrets`                        | PASS                      |
| Production migration                              | Not executed              |
| Remote D1 migration                               | Not executed              |
| Live route switch                                 | Not performed             |
| Legacy fields                                     | Retained                  |

Recommended P0-001G scope:

| Candidate                               | Why First                                                                                                                    | Allowed Work                                                                                                                                   | Forbidden Work                                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/api/employee/entry` adapter rehearsal | It is the active staff money write path and already has business validations for rent, deposit, arrears, and period anchors. | Create a non-live adapter module that produces legacy fields plus `*_fils` patches and audit plans from the same input. Test against fixtures. | Do not wire the adapter into the live route. Do not write production D1. Do not change dashboard results. |
| `empDepositMove` adapter rehearsal      | Deposit liability must balance exactly and supports negative deltas.                                                         | Add local/staging ledger balance tests with `delta_fils` and `balance_after_fils`.                                                             | Do not replace live deposit ledger function yet.                                                          |
| `arrear_tasks` update adapter rehearsal | Follow-up anchors and repayment values need integer minor-unit mirrors.                                                      | Validate `promise_amount_fils`, `actual_received_fils`, and `arrear_amount_fils` patches.                                                      | Do not finalize receivables before P0-008.                                                                |

## NO-GO For Live Switch

The project must not switch live financial write authority until these blockers are closed:

| Blocker                                     | Reason                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| P0 live decimal authority statements remain | Static scan currently reports 10 P0 live decimal authority write statements. |
| P0-003 live backend totals not switched     | Dashboard/history totals still need formal backend authority cutover.        |
| P0-002 live handover not switched           | Atomic handover is staging-only; live employee flow still legacy.            |
| P0-008 receivables not implemented          | Arrears and tail payment lifecycle is not final accounting authority.        |
| P0-006 tenant isolation not implemented     | SaaS production data isolation is not final.                                 |
| Production migration not reviewed           | `*_fils` migration remains draft/local-staging only.                         |
| Production copy reconciliation not run      | No production-copy dry-run reconciliation evidence exists.                   |
| Human approval missing                      | Accounting and production migration decisions need manual approval.          |

## Human Review Required

| Decision                                      | Why It Needs Review                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Whether `/api/save_session` remains supported | It uses manager batch `INSERT OR REPLACE`; future commercial flow may prefer atomic handover only. |
| Arrears authority model                       | Current arrears updates are legacy task-based; production accuracy depends on P0-008.              |
| Deposit negative delta policy                 | Refunds, checkout deductions, and legacy seed behavior require accounting approval.                |
| Rent config migration                         | JSON rent values need effective dates and integer-fils policy before production.                   |
| Production rollout order                      | Minor-unit writes, backend totals, handover, receivables, and tenant isolation interact.           |

## P0-001 Status

P0-001 status after this gate: `Partial - live write-path switch gate ready`.

This is not `Verified`, `Fixed`, or `Done`.

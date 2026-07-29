# TOP 25 Money Risks Category Summary

Date: 2026-05-27, Asia/Dubai

Categories can overlap. Counts below are category tags, not a 25-row exclusive
partition.

| Category                                  | Count | Highest Risk                                                                           | Production Impact                                                                           | Recommendation                                                        |
| ----------------------------------------- | ----: | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| precision / fils / decimal                |    22 | Legacy `REAL` columns and JS `Number` parsing can become accounting authority.         | Production money authority cannot switch until integer fils migration/backfill is approved. | Keep as manual accounting review; do not auto-fix.                    |
| frontend calculation authority            |     0 | No TOP_25 row is frontend-only.                                                        | Frontend remains non-authority per money policy.                                            | Keep frontend totals as display/input only.                           |
| backend totals authority                  |     3 | `cash_handover`, `bank_transfer_total`, `gross_received`.                              | Dashboard/history/handover totals cannot become production authority without approval.      | Use backend totals evidence for review; keep production switch NO-GO. |
| dashboard totals                          |     3 | Backend totals may feed future dashboard cards.                                        | Dashboard live result must not change without explicit cutover.                             | Require backend totals signoff and rollback plan.                     |
| handover totals                           |     3 | Session total fields are legacy decimals.                                              | Handover production cutover remains blocked.                                                | Require final reconciliation and cutover approval.                    |
| receivables / arrears                     |     8 | Period due, excess, promise amount, arrear tasks, employee-entry amount.               | Receivables/arrears production authority remains Partial.                                   | Require receivables lifecycle/allocation approval.                    |
| deposit handling                          |    10 | Deposit held, deposit amount, deduction, ledger amount/delta/balance, movement amount. | Deposit liability and refund handling can affect financial correctness.                     | Require accounting decision before production migration.              |
| void / soft-delete impact                 |     2 | Deposit movement/refund and receivables void impact.                                   | Voided rows must not affect active totals incorrectly.                                      | Keep void evidence in reconciliation review.                          |
| migration / backfill                      |    22 | Legacy fields need nullable fils columns and exact row-level backfill.                 | Production migration cannot proceed without SQL/row-count approval.                         | Keep as production-blocking signoff.                                  |
| accounting decision required              |    22 | Money conversion, deposits, receivables, totals.                                       | Launch blocked until Ramadan accepts or rejects each area.                                  | Use Ramadan checklist for item-by-item decision.                      |
| false positive / test-only / display-only |     3 | Sort, date helper, pagination count.                                                   | These can likely be closed as non-money scan hits.                                          | Mark only as approve candidates pending Ramadan review.               |

## Production Impact

The TOP_25 review reduces ambiguity, but does not approve production. The main
remaining accounting decisions are legacy decimal conversion, deposit liability,
receivables allocation, backend totals authority, and employee-entry live
write-path parsing.

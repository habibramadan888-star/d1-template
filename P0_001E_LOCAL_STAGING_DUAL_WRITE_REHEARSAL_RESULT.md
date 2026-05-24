# P0-001E Local/Staging Dual-Write Rehearsal Result

Generated: 2026-05-24T17:37:36.100Z, Asia/Dubai

Scope: local/staging-only rehearsal. This run used an isolated local D1 directory and did not execute production migration, remote D1 migration, staging deploy, production deploy, live dashboard switch, live handover switch, or legacy field deletion.

## Overall

| Item                               | Result                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Local/staging dual-write rehearsal | PASS                                                                      |
| Isolated local D1                  | yes                                                                       |
| Production migration executed      | no                                                                        |
| Remote D1 migration executed       | no                                                                        |
| Live accounting result changed     | no                                                                        |
| Live dashboard changed             | no                                                                        |
| Live handover flow changed         | no                                                                        |
| Legacy decimal fields retained     | yes                                                                       |
| Temporary persist path             | `C:\Users\CHINAL~1\AppData\Local\Temp\homelink-p0-001e-dual-write-iTnb4L` |

## Patch Summary

| Metric                      | Value |
| --------------------------- | ----: |
| Total sampled rows          |     6 |
| Active rows                 |     5 |
| Voided rows                 |     1 |
| Rows patched in isolated D1 |     6 |
| Invalid rows                |     0 |
| Warnings                    |    28 |

## Draft Patch Evidence

| Table            | Row                 | Voided | Draft Valid | Wrote Patch | Patch Fields                                                                                                                                                                                                               | Warnings                                                                                                                                                                                                                                                                                                           | Errors |
| ---------------- | ------------------- | ------ | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `sessions`       | `p0-001e-session-1` | no     | PASS        | yes         | cash_handover_fils, bank_transfer_total_fils, gross_received_fils                                                                                                                                                          | LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE                                                                                                                                                                                                                                                   | -      |
| `transactions`   | `p0-001e-tx-rent`   | no     | PASS        | yes         | amount_fils, due_fils, paid_fils, deficit_fils, dep_due_fils, dep_paid_fils, dep_def_fils, list_price_fils, period_due_fils, excess_fils, deposit_held_fils, deposit_amt_fils, deposit_deduction_fils, promise_amount_fils | LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE | -      |
| `transactions`   | `p0-001e-tx-voided` | yes    | PASS        | yes         | amount_fils, due_fils, paid_fils, deficit_fils                                                                                                                                                                             | LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE                                                                                                                                                                                                                             | -      |
| `deposit_ledger` | `p0-001e-dep-1`     | no     | PASS        | yes         | amount_fils, delta_fils, balance_after_fils                                                                                                                                                                                | LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE                                                                                                                                                                                                                                                   | -      |
| `arrears`        | `p0-001e-arr-1`     | no     | PASS        | yes         | remain_fils                                                                                                                                                                                                                | LEGACY_NUMBER_SOURCE                                                                                                                                                                                                                                                                                               | -      |
| `arrear_tasks`   | `p0-001e-task-1`    | no     | PASS        | yes         | arrear_amount_fils, promise_amount_fils, actual_received_fils                                                                                                                                                              | LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE, LEGACY_NUMBER_SOURCE                                                                                                                                                                                                                                                   | -      |

## Reconciliation Evidence

| Table            | Active Rows Checked | Audit Rows Checked | Active Mismatches | Active Invalid Rows | Audit Mismatches | Audit Invalid Rows | Active Result |
| ---------------- | ------------------: | -----------------: | ----------------: | ------------------: | ---------------: | -----------------: | ------------- |
| `sessions`       |                   1 |                  1 |                 0 |                   0 |                0 |                  0 | PASS          |
| `transactions`   |                   1 |                  2 |                 0 |                   0 |                0 |                  0 | PASS          |
| `deposit_ledger` |                   1 |                  1 |                 0 |                   0 |                0 |                  0 | PASS          |
| `arrears`        |                   1 |                  1 |                 0 |                   0 |                0 |                  0 | PASS          |
| `arrear_tasks`   |                   1 |                  1 |                 0 |                   0 |                0 |                  0 | PASS          |

## Rehearsal Data Evidence

| Table          | Rows Inserted |
| -------------- | ------------: |
| sessions       |             1 |
| transactions   |             2 |
| deposit_ledger |             1 |
| arrears        |             1 |
| arrear_tasks   |             1 |

## Gate Interpretation

- This proves the draft `*_fils` companion columns can be applied and populated in an isolated local/staging rehearsal.
- This does not approve production migration.
- This does not switch any live read or write path to minor units.
- P0-001 must remain Partial until live write/read paths are reviewed, switched, reconciled, and approved in later tasks.

# P0-001G Employee Entry Live Write Adapter Rehearsal Result

Generated: 2026-05-24T18:27:43.251Z, Asia/Dubai

Scope: local/staging-only rehearsal. This run used an isolated local D1 directory for evidence only. The adapter generated write plans and `*_fils` patches, but it did not write D1, did not execute production migration, did not execute remote D1 migration, did not deploy, did not switch live dashboard results, and did not switch the live employee handover flow.

## Overall

| Item                          | Result                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Adapter rehearsal             | PASS                                                                         |
| Isolated local D1             | yes                                                                          |
| D1 rows mutated by adapter    | no                                                                           |
| Production migration executed | no                                                                           |
| Remote D1 migration executed  | no                                                                           |
| Live route wired              | no                                                                           |
| Live dashboard changed        | no                                                                           |
| Live handover flow changed    | no                                                                           |
| Legacy decimal fields deleted | no                                                                           |
| Temporary persist path        | `C:\Users\CHINAL~1\AppData\Local\Temp\homelink-p0-001g-entry-adapter-UnoAsv` |

## Live Table Mutation Evidence

| Table          | Before | After | Changed |
| -------------- | -----: | ----: | ------- |
| sessions       |      0 |     0 | no      |
| transactions   |      0 |     0 | no      |
| deposit_ledger |      0 |     0 | no      |
| arrears        |      0 |     0 | no      |
| arrear_tasks   |      0 |     0 | no      |

## Scenario Evidence

| Scenario             | Expected Status | Actual Status  | Result OK | Scenario Result | Transaction Patch Fields                                                                      | Session Patch Fields                                              | Deposit Patch Fields                        | Arrear Patch Fields                                           | Warnings            | Errors        |
| -------------------- | --------------- | -------------- | --------- | --------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------- | ------------------- | ------------- |
| `rent-full-cash`     | DRAFT_READY     | DRAFT_READY    | yes       | PASS            | amount_fils, due_fils, paid_fils, deficit_fils, period_due_fils, list_price_fils, excess_fils | cash_handover_fils, bank_transfer_total_fils, gross_received_fils | -                                           | -                                                             | -                   | -             |
| `rent-short-bank`    | DRAFT_READY     | DRAFT_READY    | yes       | PASS            | amount_fils, due_fils, paid_fils, deficit_fils, period_due_fils, list_price_fils, excess_fils | cash_handover_fils, bank_transfer_total_fils, gross_received_fils | -                                           | arrear_amount_fils, promise_amount_fils, actual_received_fils | -                   | -             |
| `deposit-in`         | DRAFT_READY     | DRAFT_READY    | yes       | PASS            | amount_fils, due_fils, paid_fils, deficit_fils                                                | cash_handover_fils, bank_transfer_total_fils, gross_received_fils | amount_fils, delta_fils, balance_after_fils | -                                                             | -                   | -             |
| `deposit-refund`     | DRAFT_READY     | DRAFT_READY    | yes       | PASS            | amount_fils, due_fils, paid_fils, deficit_fils                                                | cash_handover_fils, bank_transfer_total_fils, gross_received_fils | amount_fils, delta_fils, balance_after_fils | -                                                             | -                   | -             |
| `checkout-deduction` | DRAFT_READY     | DRAFT_READY    | yes       | PASS            | amount_fils, due_fils, paid_fils, deficit_fils, deposit_deduction_fils                        | cash_handover_fils, bank_transfer_total_fils, gross_received_fils | amount_fils, delta_fils, balance_after_fils | -                                                             | -                   | -             |
| `arrears-payment`    | DRAFT_READY     | DRAFT_READY    | yes       | PASS            | amount_fils, due_fils, paid_fils, deficit_fils                                                | cash_handover_fils, bank_transfer_total_fils, gross_received_fils | -                                           | actual_received_increment_fils                                | -                   | -             |
| `invalid-3dp`        | REJECTED        | REJECTED       | no        | PASS            | -                                                                                             | -                                                                 | -                                           | -                                                             | -                   | INVALID_MONEY |
| `voided-row`         | SKIPPED_VOIDED  | SKIPPED_VOIDED | yes       | PASS            | -                                                                                             | -                                                                 | -                                           | -                                                             | VOIDED_ROW_EXCLUDED | -             |

## Gate Interpretation

- This proves the employee entry live write adapter can produce minor-unit write patches for rent, deposit collection, deposit refund, checkout deduction, arrears payment, invalid money, and voided-row exclusion.
- This does not approve production migration.
- This does not wire the adapter into `/api/employee/entry`.
- This does not switch dashboard or handover live accounting behavior.
- P0-001 remains Partial until local/staging live route wiring, reconciliation, and human review are completed in later tasks.

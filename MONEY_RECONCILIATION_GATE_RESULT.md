# Money Reconciliation Gate Result

Generated: 2026-05-24T14:37:27.643Z, Asia/Dubai

Scope: P0-001D local read-only reconciliation gate. This command reads local D1 schema/data and does not write database rows, execute remote D1, execute production migration, modify live financial formulas, or change dashboard/handover behavior.

## Overall

| Item                              | Result                 |
| --------------------------------- | ---------------------- |
| Overall gate status               | MANUAL_REQUIRED        |
| Production migration allowed      | no                     |
| Live dual-write allowed           | no                     |
| Local/staging rehearsal readiness | manual review required |

## Gate Results

| Gate                                     | Result          | Evidence                                                                                                                                                                                                                           | Notes                                                                                                 |
| ---------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| sessions future fils fields              | MANUAL_REQUIRED | missing cash_handover_fils, bank_transfer_total_fils, gross_received_fils                                                                                                                                                          | Expected before applying the P0-001E local/staging dual-write rehearsal migration.                    |
| transactions future fils fields          | MANUAL_REQUIRED | missing amount_fils, due_fils, paid_fils, deficit_fils, dep_due_fils, dep_paid_fils, dep_def_fils, list_price_fils, period_due_fils, excess_fils, deposit_held_fils, deposit_amt_fils, deposit_deduction_fils, promise_amount_fils | Expected before applying the P0-001E local/staging dual-write rehearsal migration.                    |
| deposit_ledger future fils fields        | MANUAL_REQUIRED | missing amount_fils, delta_fils, balance_after_fils                                                                                                                                                                                | Expected before applying the P0-001E local/staging dual-write rehearsal migration.                    |
| arrears future fils fields               | MANUAL_REQUIRED | missing remain_fils                                                                                                                                                                                                                | Expected before applying the P0-001E local/staging dual-write rehearsal migration.                    |
| arrear_tasks future fils fields          | MANUAL_REQUIRED | missing arrear_amount_fils, promise_amount_fils, actual_received_fils                                                                                                                                                              | Expected before applying the P0-001E local/staging dual-write rehearsal migration.                    |
| handover_commits staging fils fields     | PASS            | 0 rows; INTEGER fils fields present                                                                                                                                                                                                | Staging handover tables already store backend/frontend totals as fils.                                |
| handover_commit_rows staging fils fields | PASS            | 0 rows; INTEGER fils fields present                                                                                                                                                                                                | Staging handover tables already store backend/frontend totals as fils.                                |
| active reconciliation void rule          | PASS            | legacy financial tables include voided_at in clean local schema                                                                                                                                                                    | Active reconciliation must exclude voided_at IS NOT NULL; include_voided is audit-only.               |
| frontend totals authority                | PASS            | P0-002C staging endpoint rejects frontend totals mismatch                                                                                                                                                                          | Frontend submitted totals remain comparison data, not accounting authority.                           |
| dashboard backend totals switch          | MANUAL_REQUIRED | P0-003 is still rehearsal-only                                                                                                                                                                                                     | Production dashboard readers must not switch until backend authority and reconciliation are approved. |
| production migration safety              | PASS            | this script is read-only and uses local D1 helper                                                                                                                                                                                  | No production or remote D1 migration is performed.                                                    |

## Interpretation

- PASS means the local check found no blocking issue for that specific gate.
- WARNING means the gate is usable for rehearsal but needs explicit tracking.
- MANUAL_REQUIRED means the current state is expected for a review gate, but a human must approve the next implementation step.
- FAIL or BLOCKED must stop live dual-write work.

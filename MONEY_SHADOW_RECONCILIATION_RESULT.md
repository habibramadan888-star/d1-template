# Money Shadow Reconciliation Result

Generated: 2026-05-23T23:29:38.801Z, Asia/Dubai

Scope: P0-001B shadow validation. This script performs read-only local D1 inspection and does not modify database rows, production configuration, dashboard formulas, handover flow, or delete-session behavior.

## Summary

| Metric                                 | Count |
| -------------------------------------- | ----: |
| Money columns scanned                  |    22 |
| Values inspected                       |     0 |
| Parse OK                               |     0 |
| Empty/null values                      |     0 |
| Invalid values                         |     0 |
| More than 2 decimals                   |     0 |
| Canonical AED differs after fils parse |     0 |
| Negative values                        |     0 |

## Money Columns

| Table            | Column                | Type      |
| ---------------- | --------------------- | --------- |
| `arrear_tasks`   | `actual_received`     | `REAL`    |
| `arrear_tasks`   | `arrear_amount`       | `REAL`    |
| `arrear_tasks`   | `promise_amount`      | `REAL`    |
| `arrears`        | `remain`              | `REAL`    |
| `deposit_ledger` | `amount`              | `REAL`    |
| `deposit_ledger` | `balance_after`       | `REAL`    |
| `deposit_ledger` | `delta`               | `REAL`    |
| `sessions`       | `bank_transfer_total` | `REAL`    |
| `sessions`       | `cash_handover`       | `REAL`    |
| `sessions`       | `gross_received`      | `REAL`    |
| `transactions`   | `amount`              | `REAL`    |
| `transactions`   | `deficit`             | `REAL`    |
| `transactions`   | `dep_due`             | `REAL`    |
| `transactions`   | `deposit_amt`         | `REAL`    |
| `transactions`   | `deposit_collection`  | `INTEGER` |
| `transactions`   | `deposit_deduction`   | `REAL`    |
| `transactions`   | `deposit_held`        | `REAL`    |
| `transactions`   | `due`                 | `REAL`    |
| `transactions`   | `excess`              | `REAL`    |
| `transactions`   | `list_price`          | `REAL`    |
| `transactions`   | `period_due`          | `REAL`    |
| `transactions`   | `promise_amount`      | `REAL`    |

## Risk Findings

| Table | Column | Row | Raw Value | Status | Reason |
| ----- | ------ | --: | --------- | ------ | ------ |
| -     | -      |   - | -         | -      | -      |

## Interpretation

- ok means the legacy value can be exactly represented as integer fils.
- empty means no value was present; this may be valid for nullable legacy fields.
- over_precision means the value has more than two decimal places and cannot be accepted as AED accounting authority.
- invalid means the value cannot be parsed by the money helper.
- This is a shadow report only. It does not prove P0-001 is fixed because live legacy write paths still use decimal/REAL fields.

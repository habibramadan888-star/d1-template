# P0-003D Backend Totals Staging Scope

Generated: 2026-05-25

Scope: define which totals can be shadow-compared or rehearsed in staging. This
document does not switch production dashboard output.

| Total / KPI              | Current Source                                      | Backend Authority Candidate                                   | Can Shadow Compare | Can Staging Switch | Can Production Switch | Blocker           |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------- | ------------------ | ------------------ | --------------------- | ----------------- |
| dashboard monthly income | legacy dashboard/browser and transactions           | `computeDashboardTotalsFils` gross/operating-income candidate | yes                | no                 | no                    | BLOCKED_BY_P0_001 |
| dashboard today due      | legacy due-date/dashboard logic                     | future receivables due calculation                            | yes                | no                 | no                    | BLOCKED_BY_P0_008 |
| dashboard overdue amount | legacy arrears/task aggregation                     | receivables overdue balance                                   | yes                | no                 | no                    | BLOCKED_BY_P0_008 |
| dashboard arrears total  | legacy `arrears` / `arrear_tasks`                   | `computeArrearsOutstandingFils` interim candidate             | yes                | no                 | no                    | BLOCKED_BY_P0_008 |
| cash total               | `sessions.cash_handover` / transactions             | `computeSessionTotalsFils.cashHandoverFils`                   | yes                | yes                | no                    | PRODUCTION_NO_GO  |
| bank transfer total      | `sessions.bank_transfer_total` / transactions       | `computeSessionTotalsFils.bankTransferTotalFils`              | yes                | yes                | no                    | PRODUCTION_NO_GO  |
| gross received           | `sessions.gross_received` / transactions            | `computeSessionTotalsFils.grossReceivedFils`                  | yes                | yes                | no                    | PRODUCTION_NO_GO  |
| deposit total            | legacy transaction category / future deposit ledger | `computeDashboardTotalsFils.depositReceivedFils`              | yes                | no                 | no                    | BLOCKED_BY_P0_008 |
| rent received            | legacy transaction type/category                    | `computeDashboardTotalsFils.rentReceivedFils`                 | yes                | yes                | no                    | PRODUCTION_NO_GO  |
| arrears paid             | legacy AP / repayment rows                          | `computeDashboardTotalsFils.arrearsPaidFils`                  | yes                | no                 | no                    | BLOCKED_BY_P0_008 |
| arrears outstanding      | legacy arrears/task remaining fields                | `computeArrearsOutstandingFils` interim candidate             | yes                | no                 | no                    | BLOCKED_BY_P0_008 |
| handover totals          | handover staging backend totals                     | handover atomic backend totals                                | yes                | yes                | no                    | PRODUCTION_NO_GO  |
| session totals           | sessions submitted totals and transactions          | `computeSessionTotalsFils`                                    | yes                | yes                | no                    | PRODUCTION_NO_GO  |
| history row totals       | history row display                                 | row-level transaction recompute                               | yes                | no                 | no                    | BLOCKED_BY_P0_001 |
| voided records exclusion | legacy void fields                                  | backend active totals exclude voided rows                     | yes                | yes                | no                    | PRODUCTION_NO_GO  |
| active records totals    | legacy active row filters                           | backend active-row filters                                    | yes                | yes                | no                    | PRODUCTION_NO_GO  |

## Scope Conclusion

Staging switch rehearsal candidates:

- cash total
- bank transfer total/count
- gross received
- rent received
- handover totals
- session totals
- voided records exclusion
- active records totals

Shadow-only totals:

- dashboard monthly income
- history row totals

Blocked totals:

- dashboard today due
- dashboard overdue amount
- dashboard arrears total
- deposit total
- arrears paid
- arrears outstanding

Production status: `PRODUCTION_NO_GO`.

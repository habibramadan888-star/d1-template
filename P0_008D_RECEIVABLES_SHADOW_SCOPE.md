# P0-008D Receivables Shadow Scope

Generated: 2026-05-25, Asia/Dubai

| KPI / Concept               | Legacy Source                          | Receivable Shadow Source                   | Can Compare Now         | Can Shadow Gate    | Can Production Switch | Blocker                                               |
| --------------------------- | -------------------------------------- | ------------------------------------------ | ----------------------- | ------------------ | --------------------- | ----------------------------------------------------- |
| due today                   | legacy due/dashboard logic             | receivables `dueTodayFils`                 | NEEDS_MORE_STAGING_DATA | CAN_SHADOW_COMPARE | PRODUCTION_NO_GO      | Current staging data has no open due-today receivable |
| overdue amount              | legacy arrears/task date logic         | receivables `overdueFils`                  | NEEDS_MORE_STAGING_DATA | CAN_SHADOW_COMPARE | PRODUCTION_NO_GO      | Current staging data has no overdue receivable        |
| arrears total               | `arrears` / `arrear_tasks`             | receivables active outstanding             | NEEDS_MORE_STAGING_DATA | CAN_SHADOW_COMPARE | PRODUCTION_NO_GO      | Current staging data has no arrears rows              |
| arrears paid                | legacy arrears payment rows            | payment allocations                        | NEEDS_MORE_STAGING_DATA | SHADOW_ONLY        | PRODUCTION_NO_GO      | Needs repayment staging data                          |
| arrears outstanding         | legacy remain/difference fields        | receivables outstandingFils                | NEEDS_MORE_STAGING_DATA | CAN_SHADOW_COMPARE | PRODUCTION_NO_GO      | Needs open receivable staging data                    |
| rent due                    | employee entry / legacy rent context   | receivable amountFils                      | CAN_SHADOW_COMPARE      | CAN_SHADOW_COMPARE | PRODUCTION_NO_GO      | Accounting review required before production          |
| rent received               | transactions/backend totals            | receivable paidFils / allocations          | CAN_SHADOW_COMPARE      | CAN_SHADOW_COMPARE | PRODUCTION_NO_GO      | P0-003/P0-001 production approval                     |
| monthly income relation     | legacy dashboard monthly income        | backend totals plus receivables policy     | NEEDS_MORE_STAGING_DATA | SHADOW_ONLY        | PRODUCTION_NO_GO      | P0-001 reconciliation maturity                        |
| payment allocations         | implicit legacy links                  | `payment_allocations` drafts               | NEEDS_MORE_STAGING_DATA | SHADOW_ONLY        | PRODUCTION_NO_GO      | Needs receivables staging rehearsal data              |
| short pay                   | `arrear_tasks`                         | partial receivable                         | NEEDS_MORE_STAGING_DATA | CAN_SHADOW_COMPARE | PRODUCTION_NO_GO      | Needs short-pay staging case                          |
| repayment                   | arrears payment transaction            | payment allocation                         | NEEDS_MORE_STAGING_DATA | SHADOW_ONLY        | PRODUCTION_NO_GO      | Needs repayment staging case                          |
| void impact                 | `voided_at` / status fields            | active receivables exclude voided payments | CAN_SHADOW_COMPARE      | CAN_SHADOW_COMPARE | PRODUCTION_NO_GO      | Accounting review before production                   |
| deposit handling            | `deposit_ledger` / deposit transaction | not rent receivable by default             | CAN_SHADOW_COMPARE      | CAN_SHADOW_COMPARE | PRODUCTION_NO_GO      | Deposit lifecycle review                              |
| adjustment handling         | manual notes                           | receivable adjustments                     | NEEDS_MORE_STAGING_DATA | SHADOW_ONLY        | PRODUCTION_NO_GO      | Needs accounting-approved adjustment cases            |
| dashboard due/overdue cards | legacy dashboard cards                 | receivables shadow totals                  | CAN_SHADOW_COMPARE      | CAN_SHADOW_COMPARE | PRODUCTION_NO_GO      | BLOCKED_BY_P0_006                                     |
| history relation            | legacy history rows                    | shadow metadata only                       | NEEDS_MORE_STAGING_DATA | SHADOW_ONLY        | PRODUCTION_NO_GO      | History display switch not approved                   |

Conclusion: P0-008D is GO for read-only staging shadow gate, but NO-GO for production switch.

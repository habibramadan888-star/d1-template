# Receivables Staging Rehearsal Data Plan

Generated: 2026-05-25, Asia/Dubai

QA run id: `P0-008E-20260525-STAGING-SHADOW-001`

Source marker: `P0-008E_RECEIVABLES_SHADOW_REHEARSAL`

Target D1: `homelink-finance-staging` (`4ff78bfc-3855-436b-aefb-6b492145d79c`)

| Scenario                               | Required Data                                                         | Tables         | Writes Staging?                   | Cleanup Needed | Risk                                                   | Expected Shadow Result                               |
| -------------------------------------- | --------------------------------------------------------------------- | -------------- | --------------------------------- | -------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| due today receivable                   | One open arrear task due `2026-05-25`, 50000 fils outstanding         | `arrear_tasks` | yes, after explicit confirm       | yes            | Low; isolated `corpid` and `p0_008e_` ID               | due today = 500.00                                   |
| overdue receivable                     | One open arrear task due before business date, 80000 fils outstanding | `arrear_tasks` | yes, after explicit confirm       | yes            | Low; isolated QA row                                   | overdue = 800.00                                     |
| short pay outstanding                  | One 770.00 due / 80.00 paid row                                       | `arrear_tasks` | yes, after explicit confirm       | yes            | Low; isolated QA row                                   | outstanding = 690.00                                 |
| partial repayment                      | One 1000.00 due / 400.00 paid row                                     | `arrear_tasks` | yes, after explicit confirm       | yes            | Low; isolated QA row                                   | outstanding = 600.00                                 |
| full repayment                         | One 300.00 due / 300.00 paid row                                      | `arrear_tasks` | yes, after explicit confirm       | yes            | Low; isolated QA row                                   | outstanding = 0.00                                   |
| adjustment credit                      | One row with 100.00 credit adjustment scenario marker                 | `arrear_tasks` | yes, after explicit confirm       | yes            | Medium; shadow model intentionally differs from legacy | expected difference; outstanding reduced to 0.00     |
| adjustment debit                       | One row with 100.00 debit adjustment scenario marker                  | `arrear_tasks` | yes, after explicit confirm       | yes            | Medium; shadow model intentionally differs from legacy | expected difference; outstanding increases to 100.00 |
| voided payment impact                  | One voided rent transaction                                           | `transactions` | yes, after explicit confirm       | yes            | Low; status `VOIDED`, isolated QA row                  | ignored by active outstanding                        |
| deposit not treated as rent receivable | One deposit transaction                                               | `transactions` | yes, after explicit confirm       | yes            | Low; type/category deposit, isolated QA row            | excluded from rent receivables                       |
| no frontend totals authority           | Test-only assertion and shadow report evidence                        | tests / report | no DB write beyond above evidence | no             | Low                                                    | frontend input never authority                       |

Rules:

- Data only writes to `homelink-finance-staging`.
- Production D1 is not read or written.
- All money evidence is represented and verified as integer fils in the seed plan/tests.
- Staging rows are identifiable by `qa_run_id`, source marker, `corpid=p0-008e-shadow`, and `p0_008e_` IDs.
- Live dashboard output remains unchanged because this is a shadow comparison only.
- Cleanup is not executed in this task.

# P0-008E Dashboard Receivables Authority Evidence

Generated: 2026-05-25, Asia/Dubai

Scope: future dashboard authority evidence from staging receivables shadow rehearsal. Live dashboard output was not changed.

QA run id: `P0-008E-20260525-STAGING-SHADOW-001`

| Dashboard Card / Value    | Receivables Shadow Evidence                    | Current Result                                                 | Production Status |
| ------------------------- | ---------------------------------------------- | -------------------------------------------------------------- | ----------------- |
| due today                 | Seeded due-today receivable row                | MATCH, 500.00 scenario; aggregate due today 1190.00            | NO-GO             |
| overdue amount            | Seeded overdue and partial repayment rows      | MATCH, overdue aggregate 1400.00                               | NO-GO             |
| arrears total             | Seeded open due/overdue receivables            | MATCH, arrears total 2590.00                                   | NO-GO             |
| arrears outstanding       | Seeded short-pay and repayment rows            | MATCH, arrears outstanding 2590.00                             | NO-GO             |
| rent due                  | Receivables shadow from legacy staging rows    | MATCH, 4750.00                                                 | NO-GO             |
| rent received             | Receivables shadow from paid/allocation fields | MATCH, 2060.00                                                 | NO-GO             |
| repayment                 | Partial and full repayment QA rows             | MATCH, partial outstanding 600.00; full outstanding 0.00       | NO-GO             |
| adjustment credit         | Owner-approved credit shadow policy            | EXPECTED_DIFFERENCE, outstanding reduced from 100.00 to 0.00   | NO-GO             |
| adjustment debit          | Owner-approved debit shadow policy             | EXPECTED_DIFFERENCE, outstanding increased from 0.00 to 100.00 | NO-GO             |
| deposit handling          | Seeded deposit transaction                     | MATCH, not rent receivable by default                          | NO-GO             |
| void impact               | Seeded voided rent transaction                 | MATCH, excluded from active outstanding                        | NO-GO             |
| frontend totals authority | Test and report assertion                      | PASS, frontend totals not authority                            | NO-GO             |

## Remaining Accounting Review

- Whether due today uses promise date, contract due date, billing cycle start, or configured due date.
- Whether adjustment credit/debit requires owner approval event, audit event, and accounting code.
- Whether deposit offsets can ever reduce rent receivable without explicit approval.
- Whether repayment allocation must select oldest due, user-selected receivable, or contract-defined priority.

## P0-006 Dependency

Production dashboard receivables authority still requires tenant/property scope so receivable totals are filtered by company, property, room/customer, and authorized user membership.

## Dashboard Mutation Result

No dashboard live response was changed. P0-008E only seeded staging QA rows and generated shadow comparison evidence.

Production remains `NO-GO`.

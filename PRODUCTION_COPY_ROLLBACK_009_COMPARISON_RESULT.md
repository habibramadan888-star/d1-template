# Production Copy Rollback 009 Comparison Result

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

Conclusion: `PASS_WITH_WARNINGS`

| Check                       | Expected                                      | Actual                                            | Result            | Notes                                                                        |
| --------------------------- | --------------------------------------------- | ------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------- |
| Schema state after rollback | Schema remains, data fields reverted          | Schema remains                                    | PASS              | Reverse update rollback does not remove schema columns.                      |
| Business row counts         | unchanged                                     | unchanged                                         | PASS              | No row count changed for reviewed tables.                                    |
| Money `*_fils` state        | REVIEW-007 populated values cleared           | remaining populated rows = 0                      | PASS              | Money compatibility values were reverted on copy.                            |
| Tenant scope columns state  | REVIEW-007 compatibility values cleared       | remaining populated rows = 0                      | PASS              | Legacy source fields preserved.                                              |
| Receivables state           | empty                                         | empty                                             | PASS              | No receivables rows were created in REVIEW-007 or rollback.                  |
| Audit/event scope state     | REVIEW-007 compatibility values cleared       | remaining populated rows = 0                      | PASS              | Audit/event rows preserved; compatibility scope cleared.                     |
| Expected reverted changes   | all REVIEW-007 row-level compatibility fields | reverted                                          | PASS              | No unexpected retained populated compatibility fields detected.              |
| Unexpected differences      | none expected                                 | none detected in row counts / target field counts | PASS              | Detailed value diff is not required because rollback target fields are null. |
| Manual review items         | production rollback approval remains required | still required                                    | PASS_WITH_WARNING | Copy rollback is evidence, not production approval.                          |

Warnings:

- This rollback rehearsed row-level reverse updates on the production-copy only.
- Production rollback should prefer restore from a fresh production backup unless
  exact primary-key reverse-update lists are separately approved.
- Production cutover remains `PRODUCTION_NO_GO`.

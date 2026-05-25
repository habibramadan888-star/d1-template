# Receivables Local/Staging Rehearsal Result

Generated: 2026-05-25T16:26:42.012Z

Scope: local/staging dry-run receivables rehearsal. This script does not deploy, migrate, write production D1, write staging D1 by default, or change dashboard responses.

Overall: `PASS`

Fixtures loaded: 15
Manual review rows: 1

| Scenario                                   | Legacy Result                              | Receivable Result                   | Delta | Status              | Notes                                                                           |
| ------------------------------------------ | ------------------------------------------ | ----------------------------------- | ----- | ------------------- | ------------------------------------------------------------------------------- |
| rent due unpaid                            | legacy due/arrears task equivalent         | OPEN outstanding 770.00             | 0.00  | MATCH               | Rent due has a draft source-of-truth receivable without writing D1.             |
| short pay                                  | legacy arrear task expected                | PARTIAL outstanding 690.00          | 0.00  | MATCH               | Short pay remains outstanding and is not treated as discount.                   |
| full payment                               | no arrear expected                         | SETTLED outstanding 0.00            | 0.00  | MATCH               | Full payment closes the draft receivable.                                       |
| partial repayment                          | legacy remaining decreases                 | PARTIAL outstanding 490.00          | 0.00  | MATCH               | Allocation reduces outstanding without frontend authority.                      |
| full repayment                             | legacy arrear closes                       | SETTLED outstanding 0.00            | 0.00  | MATCH               | Allocation closes the receivable.                                               |
| overpayment                                | manual accounting review required          | OVERPAID overpaid 30.00             | 0.00  | EXPECTED_DIFFERENCE | Overpayment is separate state, not negative receivable.                         |
| voided payment                             | voided payment excluded from active totals | VOIDED_IGNORED outstanding 690.00   | 0.00  | MATCH               | Voided payment does not reduce outstanding.                                     |
| legacy arrears comparison                  | 690.00                                     | 690.00                              | 0.00  | MATCH               | Legacy arrears can be compared to receivable drafts before migration.           |
| deposit handling                           | deposit ledger row                         | 0 rent receivables                  | 0.00  | MATCH               | Deposit is not rent receivable unless explicitly configured.                    |
| credit adjustment                          | owner-approved waiver                      | SETTLED outstanding 0.00            | 0.00  | MATCH               | Credit adjustment reduces outstanding without pretending cash was received.     |
| debit adjustment                           | correction increases obligation            | PARTIAL outstanding 30.00           | 0.00  | MATCH               | Debit adjustment increases amount due and outstanding.                          |
| dashboard due and arrears future authority | blocked by P0-008 today                    | due today 1460.00 / arrears 1460.00 | 0.00  | MANUAL_REQUIRED     | Future dashboard authority is computable, but live dashboard remains unchanged. |

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Staging D1 write: no.
- Dashboard mutation: no.
- Live financial formula mutation: no.
- Frontend totals authority: no.

Decision:

- Receivables pure module and fixture rehearsal are sufficient for local/staging shadow planning.
- Production remains blocked by P0-001 reconciliation maturity, P0-003 production approval, P0-006 tenant scope, migration review, and human accounting review.
- Future staging writes require a separate approved P0-008D task with backup, rollback, feature flag, and no production touch.

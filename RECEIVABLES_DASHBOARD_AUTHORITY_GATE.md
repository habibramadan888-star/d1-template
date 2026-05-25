# Receivables Dashboard Authority Gate

Status: local/staging future-authority gate. Live dashboard remains unchanged.

| Dashboard Total       | Future Authority                                           | Current Authority                     | Staging Shadow | Production Switch | Blocker                              |
| --------------------- | ---------------------------------------------------------- | ------------------------------------- | -------------- | ----------------- | ------------------------------------ |
| due today             | receivables active outstanding due on business date        | legacy dashboard logic                | Yes            | No                | P0-008, P0-006, timezone review      |
| overdue amount        | receivables active outstanding due before business date    | legacy arrears/task aggregation       | Yes            | No                | P0-008, P0-006                       |
| arrears total         | receivables active outstanding due on/before business date | `arrears` / `arrear_tasks`            | Yes            | No                | P0-008 reconciliation                |
| arrears paid          | payment allocations to receivables                         | legacy arrears payment rows           | Yes            | No                | P0-008 allocation migration          |
| arrears outstanding   | receivables outstanding                                    | legacy remain/difference fields       | Yes            | No                | P0-008 reconciliation                |
| rent due              | receivables generated from rent config                     | rent formula / employee entry context | Yes            | No                | P0-008 + rent config effective dates |
| rent received         | backend totals / payment allocations                       | transactions/session totals           | Yes            | No                | P0-003 production approval           |
| monthly income        | backend totals plus receivables policy                     | legacy dashboard                      | Shadow only    | No                | P0-001 reconciliation maturity       |
| deposit total         | deposit ledger, not rent receivables                       | deposit transactions/ledger           | Shadow only    | No                | deposit lifecycle review             |
| active records totals | backend totals excluding voided rows                       | legacy filters                        | Yes            | No                | production approval                  |

## Gate Decision

GO for local/staging shadow:

- Rent due, short pay, repayment, outstanding, due today, overdue, and arrears can be computed in fixture/local staging rehearsal.
- Legacy arrears can be compared to receivable drafts.
- Voided payment exclusion and deposit separation can be tested.

NO-GO for production:

- No production receivables migration is approved.
- P0-001 minor-unit reconciliation remains Partial.
- P0-006 tenant/property scope remains Partial.
- Receivable dashboard totals need human accounting review.
- Production rollback/backfill is not rehearsed.

Rollback strategy:

- Keep live dashboard on legacy source.
- Keep receivables in shadow/rehearsal until explicit production cutover approval.
- If a future staging flag is introduced, set it false and verify dashboard returns legacy behavior.

Reconciliation strategy:

- Compare legacy `arrears` / `arrear_tasks` outstanding against receivable drafts.
- Compare backend received totals against allocation totals.
- Treat all deltas as `MANUAL_REQUIRED` until accountant review.

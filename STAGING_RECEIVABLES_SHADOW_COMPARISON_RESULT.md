# Staging Receivables Shadow Comparison Result

Generated: 2026-05-25T20:19:25.255Z

Scope: read-only staging receivables shadow comparison. This script does not deploy, migrate, write D1 rows, mutate dashboard output, or enable feature flags.

Target D1: `homelink-finance-staging` (`4ff78bfc-3855-436b-aefb-6b492145d79c`)

Overall: `PASS`

| Scenario                      | Legacy Value                    | Receivable Shadow Value                         | Delta   | Status              | Notes                                                                                                                             |
| ----------------------------- | ------------------------------- | ----------------------------------------------- | ------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| rent received                 | 2060.00                         | 2060.00                                         | 0.00    | MATCH               | Backend rent received plus legacy arrears paid vs receivable paid/allocation shadow.                                              |
| rent due                      | 4750.00                         | 4750.00                                         | 0.00    | MATCH               | Staging rent payments plus legacy arrears due vs receivable amount shadow.                                                        |
| arrears outstanding           | 2590.00                         | 2590.00                                         | 0.00    | MATCH               | Legacy arrears rows compared to receivable outstanding.                                                                           |
| due today                     | 1190.00                         | 1190.00                                         | 0.00    | MATCH               | Legacy due-today outstanding compared to receivables shadow due-today total.                                                      |
| overdue amount                | 1400.00                         | 1400.00                                         | 0.00    | MATCH               | Legacy overdue outstanding compared to receivables overdue shadow.                                                                |
| arrears total                 | 2590.00                         | 2590.00                                         | 0.00    | MATCH               | Future dashboard arrears authority remains shadow-only pending accounting review.                                                 |
| deposit handling              | 0.00                            | 0.00                                            | 0.00    | MATCH               | Deposit rows are not treated as rent receivables unless explicitly configured.                                                    |
| void impact                   | 1 voided rows                   | active outstanding excludes voided rows         | 0.00    | MATCH               | Voided payments do not reduce active receivable outstanding.                                                                      |
| legacy warnings               | 3 transactions / 7 arrears rows | 0 warnings / 0 errors                           | 0.00    | LEGACY_WARNING      | Legacy decimal data is parsed into integer fils and any skipped rows are explicit.                                                |
| dashboard live result         | unchanged                       | shadow report only                              | 0.00    | MATCH               | This script does not call or mutate dashboard live responses.                                                                     |
| P0-008E due today             | 500.00                          | 500.00                                          | 0.00    | MATCH               | Seeded staging-only due-today arrear row generated receivables due-today evidence.                                                |
| P0-008E overdue               | 800.00                          | 800.00                                          | 0.00    | MATCH               | Seeded staging-only overdue arrear row generated receivables overdue evidence.                                                    |
| P0-008E short pay outstanding | 690.00                          | 690.00                                          | 0.00    | MATCH               | Short-pay QA row leaves active outstanding receivable balance.                                                                    |
| P0-008E partial repayment     | 600.00                          | 600.00                                          | 0.00    | MATCH               | Partial repayment is modeled as a payment allocation that reduces outstanding.                                                    |
| P0-008E full repayment        | 0.00                            | 0.00                                            | 0.00    | MATCH               | Full repayment closes the receivable with zero outstanding.                                                                       |
| P0-008E adjustment credit     | 100.00                          | 0.00                                            | 100.00  | EXPECTED_DIFFERENCE | Owner-approved credit adjustment reduces outstanding in shadow model; legacy row remains comparison-only.                         |
| P0-008E adjustment debit      | 0.00                            | 100.00                                          | -100.00 | EXPECTED_DIFFERENCE | Owner-approved debit adjustment increases shadow receivable amount; production needs accounting approval before authority switch. |
| P0-008E voided payment impact | 1 voided staging transaction    | voided payment excluded from active outstanding | 0.00    | MATCH               | Seeded voided payment row is ignored by active receivable totals.                                                                 |
| P0-008E deposit exclusion     | 1 staging deposit transaction   | not a rent receivable by default                | 0.00    | MATCH               | Seeded deposit row is excluded from rent receivable authority unless configured.                                                  |

Summary:

- Mismatches: 0.
- Blocked rows: 0.
- Needs more data rows: 0.
- Manual required rows: 0.
- Expected difference rows: 2.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Staging D1 write: no.
- Feature flag enabled: no.
- Dashboard mutation: no.
- Frontend totals authority: no.

Interpretation:

- `MATCH` means the legacy/staging value and receivable shadow value matched for the checked scope.
- `NEEDS_MORE_DATA` means current staging QA data lacks the relevant open receivable, repayment, or adjustment case.
- `EXPECTED_DIFFERENCE` means receivables shadow intentionally differs from legacy comparison because an adjustment or policy transform was applied.
- `LEGACY_WARNING` means legacy rows were parsed into integer fils and need accounting review before production.
- `MISMATCH` or `BLOCKED` prevents the next rehearsal until reviewed.

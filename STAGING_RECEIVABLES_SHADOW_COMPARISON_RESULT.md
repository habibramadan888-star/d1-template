# Staging Receivables Shadow Comparison Result

Generated: 2026-05-25T18:48:59.106Z

Scope: read-only staging receivables shadow comparison. This script does not deploy, migrate, write D1 rows, mutate dashboard output, or enable feature flags.

Target D1: `homelink-finance-staging` (`4ff78bfc-3855-436b-aefb-6b492145d79c`)

Overall: `PASS`

| Scenario              | Legacy Value                    | Receivable Shadow Value                 | Delta | Status          | Notes                                                                                    |
| --------------------- | ------------------------------- | --------------------------------------- | ----- | --------------- | ---------------------------------------------------------------------------------------- |
| rent received         | 80.00                           | 80.00                                   | 0.00  | MATCH           | Backend rent received plus legacy arrears paid vs receivable paid/allocation shadow.     |
| rent due              | 80.00                           | 80.00                                   | 0.00  | MATCH           | Staging rent payments plus legacy arrears due vs receivable amount shadow.               |
| arrears outstanding   | 0.00                            | 0.00                                    | 0.00  | NEEDS_MORE_DATA | No legacy arrears rows in current staging QA data; more short-pay/repayment data needed. |
| due today             | 0.00                            | 0.00                                    | 0.00  | NEEDS_MORE_DATA | Current staging data has no open due-today receivable.                                   |
| overdue amount        | 0.00                            | 0.00                                    | 0.00  | NEEDS_MORE_DATA | No overdue arrears rows in current staging QA data.                                      |
| arrears total         | 0.00                            | 0.00                                    | 0.00  | NEEDS_MORE_DATA | Future dashboard arrears authority remains shadow-only pending accounting review.        |
| deposit handling      | 0.00                            | 0.00                                    | 0.00  | MATCH           | Deposit rows are not treated as rent receivables unless explicitly configured.           |
| void impact           | 0 voided rows                   | active outstanding excludes voided rows | 0.00  | MATCH           | Voided payments do not reduce active receivable outstanding.                             |
| legacy warnings       | 1 transactions / 0 arrears rows | 0 warnings / 0 errors                   | 0.00  | LEGACY_WARNING  | Legacy decimal data is parsed into integer fils and any skipped rows are explicit.       |
| dashboard live result | unchanged                       | shadow report only                      | 0.00  | MATCH           | This script does not call or mutate dashboard live responses.                            |

Summary:

- Mismatches: 0.
- Blocked rows: 0.
- Needs more data rows: 4.
- Manual required rows: 0.

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
- `LEGACY_WARNING` means legacy rows were parsed into integer fils and need accounting review before production.
- `MISMATCH` or `BLOCKED` prevents the next rehearsal until reviewed.

# Staging Backend Totals Comparison Result

Generated: 2026-05-25T16:27:32.596Z

Scope: read-only staging D1 comparison. This script does not deploy, migrate, write D1 rows, mutate API responses, or change dashboard output.

Target D1: `homelink-finance-staging` (`4ff78bfc-3855-436b-aefb-6b492145d79c`)

Overall: `MANUAL_REQUIRED`

| Scenario                                                  | Current / Legacy Total      | Backend Authority Candidate          | Delta | Status          | Notes                                                                        |
| --------------------------------------------------------- | --------------------------- | ------------------------------------ | ----- | --------------- | ---------------------------------------------------------------------------- |
| cash total                                                | 80.00                       | 80.00                                | 0.00  | MATCH           | Legacy sessions cash_handover vs backend active transaction recompute.       |
| bank transfer total                                       | 0.00                        | 0.00                                 | 0.00  | MATCH           | Legacy sessions bank_transfer_total vs backend active transaction recompute. |
| bank transfer count                                       | 0                           | 0                                    | 0     | MATCH           | Legacy session bank transfer count vs backend active bank-row recompute.     |
| gross received                                            | 80.00                       | 80.00                                | 0.00  | MATCH           | Legacy sessions gross_received vs backend gross received candidate.          |
| rent received                                             | 80.00                       | 80.00                                | 0.00  | MATCH           | Legacy rent-category transaction total vs backend rent received candidate.   |
| session totals: stg-ee-session-1779711007144-1e4a78-valid | cash 80 / bank 0 / gross 80 | cash 80.00 / bank 0.00 / gross 80.00 | 0.00  | LEGACY_WARNING  | Session frontend totals are comparison input only.                           |
| legacy decimal / fils conversion                          | 1 transaction rows          | 1 warnings / 0 errors                | 0.00  | LEGACY_WARNING  | Legacy decimal values are parsed to integer fils for shadow comparison.      |
| voided records exclusion                                  | 0 excluded rows             | active totals exclude voided rows    | 0.00  | MATCH           | Backend active totals exclude voided rows by default.                        |
| active records totals                                     | 1 included rows             | 1 active rows                        | 0.00  | MATCH           | Backend active totals include accepted rows and exclude voided rows.         |
| arrears outstanding                                       | 0.00                        | 0.00                                 | 0.00  | BLOCKED         | Interim shadow only; final authority blocked by P0-008 receivables.          |
| dashboard/history API current result                      | MANUAL_REQUIRED             | read-only D1 candidate generated     | 0.00  | MANUAL_REQUIRED | No authenticated API response mutation was performed by this script.         |

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Staging D1 write: no.
- API response mutation: no.
- Dashboard mutation: no.

Interpretation:

- `MATCH` means the staging legacy total and backend candidate matched for the checked scope.
- `LEGACY_WARNING` means the candidate was computed from legacy decimal fields and needs minor-unit reconciliation before production.
- `MISMATCH` blocks staging switch rehearsal for that total until reviewed.
- `BLOCKED` means the total is intentionally blocked by unresolved P0 dependencies.
- `MANUAL_REQUIRED` means authenticated dashboard/history response evidence is still required before switch rehearsal.

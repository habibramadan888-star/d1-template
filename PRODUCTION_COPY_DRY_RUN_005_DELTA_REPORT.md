# Production Copy Dry-Run 005 Delta Report

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

| Delta Area                   | Expected                                              | Actual                                                  | Result             | Notes                                                         |
| ---------------------------- | ----------------------------------------------------- | ------------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| Schema changes               | Nullable columns and empty future tables on copy only | Applied to copy only                                    | PASS               | No production schema change.                                  |
| Business row counts          | No change to existing legacy business rows            | No change to existing row counts                        | PASS               | Existing table counts match before snapshot.                  |
| New handover tables          | Created empty future tables                           | Created with 0 rows                                     | PASS               | No live handover data created.                                |
| New receivables tables       | Created empty future tables                           | Created with 0 rows                                     | PASS               | No receivables data backfill executed.                        |
| Money `*_fils` values        | Columns exist; values require reviewed backfill       | 0 populated `*_fils` values in transaction money fields | MANUAL_REQUIRED    | Accounting conversion not approved.                           |
| Tenant/property scope values | Columns exist; values require exact mapping           | 0 scoped legacy rows across inspected legacy tables     | MANUAL_REQUIRED    | Production tenant mapping not approved.                       |
| Audit/event scope values     | Columns exist; values require mapping/evidence        | 0 scoped audit/event legacy rows                        | MANUAL_REQUIRED    | Audit/event visibility policy still needs approval.           |
| Backend totals comparison    | Legacy aggregates can be read                         | Active transaction legacy aggregate query succeeded     | PASS_WITH_WARNINGS | Authority switch remains blocked by money/receivables review. |
| Unexpected updates           | none expected                                         | none found in business row counts                       | PASS               | D1 internal schema rows changed as expected.                  |

## Read-Only Aggregate Evidence

| Metric                                            |    Value |
| ------------------------------------------------- | -------: |
| Active transaction rows inspected                 |      232 |
| Legacy amount total                               | 123850.5 |
| Legacy due total                                  |    43800 |
| Legacy paid total                                 |    37570 |
| Legacy deficit total                              |     6230 |
| Legacy bank total                                 |    20410 |
| Legacy cash total                                 |    99570 |
| Legacy arrears rows                               |        6 |
| Legacy arrears remain total                       |      860 |
| Transaction `amount_fils` populated rows          |        0 |
| Transaction `due_fils` populated rows             |        0 |
| Transaction `paid_fils` populated rows            |        0 |
| Transaction `deficit_fils` populated rows         |        0 |
| Scoped legacy rows across inspected tenant tables |        0 |
| Scoped audit logs                                 |        0 |
| Scoped entry events                               |        0 |

Conclusion: schema dry-run passed on the copy. Data migration/backfill/reconciliation remains manual-required.

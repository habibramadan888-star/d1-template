# Production Copy Dry-Run Checklist

Date: 2026-05-26, Asia/Dubai

Status: `MANUAL_REQUIRED`

Production cutover: `PRODUCTION_NO_GO`

|   # | Checklist Item                                  | Required Before Copy Dry-Run | Current Status  |
| --: | ----------------------------------------------- | ---------------------------- | --------------- |
|   1 | Production D1 name / id confirmed               | Yes                          | MANUAL_REQUIRED |
|   2 | Production backup completed                     | Yes                          | NOT_STARTED     |
|   3 | Backup stored outside git                       | Yes                          | MANUAL_REQUIRED |
|   4 | Production-copy D1 created                      | Yes                          | NOT_STARTED     |
|   5 | Production-copy D1 restored/imported            | Yes                          | NOT_STARTED     |
|   6 | Production-copy not bound to production Worker  | Yes                          | MANUAL_REQUIRED |
|   7 | Production-copy feature flags disabled          | Yes                          | MANUAL_REQUIRED |
|   8 | Production-copy migration dry-run plan reviewed | Yes                          | MANUAL_REQUIRED |
|   9 | Production-copy backfill dry-run plan reviewed  | Yes                          | MANUAL_REQUIRED |
|  10 | Row counts expected                             | Yes                          | MANUAL_REQUIRED |
|  11 | Rollback plan reviewed                          | Yes                          | MANUAL_REQUIRED |
|  12 | Accounting review completed                     | Yes                          | MANUAL_REQUIRED |
|  13 | Tenant mapping review completed                 | Yes                          | MANUAL_REQUIRED |
|  14 | Receivables review completed                    | Yes                          | MANUAL_REQUIRED |
|  15 | TOP_25_MONEY_RISKS reviewed                     | Yes                          | MANUAL_REQUIRED |
|  16 | Commercial launch gate still `PRODUCTION_NO_GO` | Yes                          | CONFIRMED       |

## Stop Conditions

Stop before copy dry-run if any of the following is missing:

- Production D1 target confirmation.
- Backup approval.
- Rollback plan.
- Copy isolation plan.
- Exact migration/backfill plan.
- Accounting/data owner review.
- Tenant mapping review.

Conclusion: production-copy dry-run is not approved yet. This checklist defines
the future approval gate only.

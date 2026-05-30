# Arrears Allowed Source Model Final

Production cutover remains `PRODUCTION_NO_GO`.

| Source                        | Included | Amount Source                             | Display Label  | Notes                                                                                      |
| ----------------------------- | -------: | ----------------------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| existing_arrears_record       |      yes | Existing arrears record amount            | 系统已有欠款   | Legacy `arrears` / `arrear_tasks` / `historical_arrears` aliases normalize to this source. |
| ttlock_expired_unpaid         |      yes | Bed rent mapping for the expired card bed | 通通锁到期未付 | Included only when the bed has a configured rent amount.                                   |
| current_due_unpaid            |       no | n/a                                       | n/a            | Not allowed as an independent third source.                                                |
| unknown / random / debug rows |       no | n/a                                       | n/a            | Excluded from the default owner arrears list.                                              |

Answers:

1. Only two sources are retained: `existing_arrears_record` and `ttlock_expired_unpaid`.
2. TTLock expired unpaid enters the arrears pool when the card is expired, unpaid, and the bed has rent configured.
3. TTLock amount comes from bed rent mapping, not from an unknown/placeholder amount.
4. Beds without rent configuration are excluded from the default owner list and should be handled as internal QA/configuration issues.
5. No third source remains in the default owner arrears list.

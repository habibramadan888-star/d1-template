# Owner Overview Arrears Two Source Result

Only two arrears sources are allowed in the owner arrears module.

| Source                    | Included | Amount Source                            | Display Label  | Notes                                           |
| ------------------------- | -------- | ---------------------------------------- | -------------- | ----------------------------------------------- |
| `existing_arrears_record` | yes      | Existing arrears/task remaining amount   | 系统已有欠款   | Primary system arrears records                  |
| `ttlock_expired_unpaid`   | yes      | Bed rent matched by room/bed rent config | 通通锁到期未付 | Only included when bed rent amount is available |
| `current_due_unpaid`      | no       | n/a                                      | n/a            | Not displayed as an independent third source    |
| unknown/random rows       | no       | n/a                                      | n/a            | Filtered by source allow-list                   |
| amount unknown rows       | no       | n/a                                      | n/a            | Not included in default list                    |

TTLock expired unpaid rows still require `bedRentAmountForArrears(card) > 0`; missing rent config is excluded from the default follow-up list and should be handled as configuration QA, not as a formal arrears task.

No arrears calculation logic was changed.

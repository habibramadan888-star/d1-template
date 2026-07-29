# Arrears Follow-up Final QA Plan

Status: final QA design only  
Execution boundary: no production D1 write

## Test Cases

|   # | Test                               | Expected                                               |
| --: | ---------------------------------- | ------------------------------------------------------ |
|   1 | `historical_arrears` creates task  | Task created or deduped with source preserved          |
|   2 | `current_due_unpaid` creates task  | Task created with accounting source evidence           |
|   3 | `ttlock_expired_card` creates task | Operational task created with unknown amount authority |
|   4 | Dedupe duplicate source            | No duplicate active task                               |
|   5 | Employee views own tasks           | Only assigned tasks returned                           |
|   6 | Owner views all tasks              | All tenant/property scoped tasks returned              |
|   7 | Readonly admin views read-only     | Data visible, no write action allowed                  |
|   8 | Employee attempts close            | 403                                                    |
|   9 | Employee attempts void             | 403                                                    |
|  10 | Promised without payment date      | 400                                                    |
|  11 | Promise date passes                | System or read model shows `promise_overdue`           |
|  12 | Paid reported                      | Does not equal `payment_matched`                       |
|  13 | Owner closes                       | Succeeds only with close reason                        |
|  14 | False positive                     | Record retained, not deleted                           |
|  15 | Moved out                          | Record retained, not deleted                           |
|  16 | WhatsApp staff export              | Matches short format                                   |
|  17 | Risk score                         | Calculated by final model                              |
|  18 | Audit trail                        | Every mutation has audit row                           |
|  19 | Permission error                   | Returns 403                                            |
|  20 | Production D1 protection           | No production D1 write executed                        |

## Required Regression Gates

- Standard response format.
- Role/scope enforcement.
- Idempotency for mutation APIs.
- No secret leakage in logs or reports.
- `qa:employee-entry-staging` remains `MANUAL_REQUIRED / DRY_RUN_ONLY` unless separately approved.

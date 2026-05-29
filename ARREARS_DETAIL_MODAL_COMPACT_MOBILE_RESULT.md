# Arrears Detail Modal Compact Mobile Result

| Requirement                               | Result |
| ----------------------------------------- | ------ |
| Modal opens                               | yes    |
| Compact mode renders                      | yes    |
| Multiple rows visible in mobile viewport  | yes    |
| Row includes room/card/due/overdue/status | yes    |
| Details can expand                        | yes    |
| No horizontal overflow by design          | yes    |
| Export/copy/close remain accessible       | yes    |
| Calculation changed                       | no     |
| D1 write                                  | no     |

The arrears modal now uses `arrears-compact-row` rows instead of large field-grid cards. Each row shows room, tenant/card, due date, overdue days, amount, and status, with optional expandable details for secondary information.

# Arrears Export Format Fix Result

| Requirement                              | Result |
| ---------------------------------------- | ------ |
| Starts with summary                      | yes    |
| Includes generated time                  | yes    |
| Includes total count                     | yes    |
| Groups overdue aging                     | yes    |
| No ASCII box art                         | yes    |
| No empty `update:` field                 | yes    |
| Missing amount marked as `金额未接入`    | yes    |
| Includes room/card/due date/overdue days | yes    |
| Calculation logic changed                | no     |
| D1 write                                 | no     |

Validation: `npm run test:arrears-export-format` passed.

# Owner Arrears Match History Visual Result

Production cutover remains `PRODUCTION_NO_GO`.

| Visual Area     | History Page Standard               | Arrears Page After Fix                                        | Match |
| --------------- | ----------------------------------- | ------------------------------------------------------------- | ----- |
| Card class      | `hist-card`                         | Arrears card uses `hist-card owner-arrears-task-card`         | yes   |
| Card radius     | `var(--r2)` / history card radius   | Arrears card uses `var(--r2)` and mobile 17px radius          | yes   |
| Padding         | 16px card padding                   | Arrears card uses 16px desktop, 13px mobile                   | yes   |
| Typography      | history identity + `hist-stat` rows | Arrears uses identity line plus `hist-stat` rows              | yes   |
| Anchor/subtitle | `hist-anchor`                       | Source/due line uses `hist-anchor owner-arrears-due-line`     | yes   |
| Button style    | clear pill buttons                  | Arrears action buttons are compact, non-wrapping, and grouped | yes   |
| Mobile width    | single column                       | Arrears list is one column, full width                        | yes   |
| Debug output    | none                                | Raw source/directive/promise/staff fields removed from card   | yes   |

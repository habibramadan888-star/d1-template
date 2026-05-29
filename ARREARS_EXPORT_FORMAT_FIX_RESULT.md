# Arrears Export Format Fix Result

| Requirement                             | Result           |
| --------------------------------------- | ---------------- | --- |
| Title format `Due M/D                   | N overdue`       | yes |
| Bed grouping with `【bed】`             | yes              |
| One record per line                     | yes              |
| Customer id first                       | yes              |
| `overdueDays > 1` includes fire marker  | yes              |
| `overdueDays = 1` has no fire marker    | yes              |
| `Due` has no fire marker                | yes              |
| Removes `重点` / `核对` categories      | yes              |
| Removes `金额未接入` from export output | yes              |
| Removes `update` field                  | yes              |
| Keeps WhatsApp searchable ids           | yes              |
| Calculation logic changed               | no               |
| D1 write                                | no               |
| Migration                               | no               |
| Production cutover                      | PRODUCTION_NO_GO |

Validation: `npm run test:arrears-export-format` passed.

# Owner Outstanding Mobile Card Alignment Result

| Requirement                                   | Result                |
| --------------------------------------------- | --------------------- |
| Outstanding items shown as mobile cards       | YES in owner overview |
| Each item has room / note / amount            | YES                   |
| Avoid old table-first presentation            | YES for overview list |
| No write action shown in overview             | YES                   |
| No amount calculation changed                 | YES                   |
| No write logic changed                        | YES                   |
| Owner entry write remains hidden / downgraded | YES                   |

The owner overview uses `state.arrears` read-only data to show follow-up items. It does not submit, modify, void, or delete anything.

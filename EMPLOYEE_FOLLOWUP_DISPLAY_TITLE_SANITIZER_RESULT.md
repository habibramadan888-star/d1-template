# Employee Follow-up Display Title Sanitizer Result

Date: 2026-06-01

| Rule | Result |
|---|---|
| Hide `+971...` / `971...` account-like tokens | PASS |
| Hide `ttlock_card` from default title | PASS |
| Hide `source_ref` from default title | PASS |
| Keep bed/room and useful remark fragments | PASS |
| Keep raw backend fields unchanged | PASS |
| Do not delete source references | PASS |
| Production cutover | PRODUCTION_NO_GO |

Sanitizer behavior:

- Input example: `329 D100 1207p05 08p23 +971525199099`
- Display output: `329 D100 1207p05 08p23`

Placement:

- The sanitizer is applied only inside `followupTitle()` for default employee System Reminder cards.
- Raw identifiers remain available outside the employee default title path.

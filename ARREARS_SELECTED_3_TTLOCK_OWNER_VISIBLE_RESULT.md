# Selected 3 TTLock Owner Visible Result

Date: 2026-06-01, Asia/Dubai

Result: READ-ONLY VISIBILITY CONFIRMED; ASSIGNED VISIBILITY NOT CREATED.

The owner read model shows the three selected TTLock expired unpaid rows, but they remain unassigned because no write was executed.

| Room / Bed | Visible In Owner Read Model | Assigned After Write | Notes |
|---|---|---|---|
| 112 | yes | no | Write blocked before directive create. |
| 113 | yes | no | Write blocked before directive create. |
| 125 | yes | no | Write blocked before directive create. |

| Boundary | Status |
|---|---|
| Owner visibility source | `/api/boss/arrears/followup-tasks` read model |
| Owner directive write | not run |
| Production D1 write | no |
| Production cutover | `PRODUCTION_NO_GO` |

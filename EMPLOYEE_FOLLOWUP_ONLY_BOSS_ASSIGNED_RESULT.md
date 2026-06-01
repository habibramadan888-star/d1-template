# Employee Follow-up Only Boss Assigned Result

Status: `PASS`

Follow-up now contains only the employee boss-assigned task inbox.

| Area | After Fix |
|---|---|
| Follow-up title | `Follow-up / 跟进` |
| Follow-up subtitle | `Boss assigned tasks / 老板下发任务` |
| Main container | `bossDirectiveList` |
| Data source | `/api/employee/arrears/directives` |
| System Reminders in Follow-up | Removed |
| `taskList` in Follow-up | Removed |
| Boss Assigned count | Still based on persisted directive rows only |

System reminder rendering no longer calls `renderEmployeeDirectiveInbox()`, so refreshing System does not mutate or fake the boss-assigned inbox state.

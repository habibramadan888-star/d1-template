# Employee Nav Split Route Result

Status: `PASS`

| Route / Hash | Target View | Result |
|---|---|---|
| default / empty hash | Entry | PASS |
| `#entry` | Entry | PASS |
| `#followup` | Follow-up | PASS |
| `#arrears` | Follow-up legacy alias | PASS |
| `#system` | System | PASS |
| `#export` | Redirects to `#followup` | PASS |

Route behavior:

- Follow-up loads boss assigned directives through `loadEmployeeArrearsDirectives(true)`.
- System loads reminders through `loadTasks(true)`.
- Entry does not trigger reminder or directive fetches during tab switch.

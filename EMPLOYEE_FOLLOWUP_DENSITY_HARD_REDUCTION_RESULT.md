# Employee Follow-up Density Hard Reduction Result

Task: EMPLOYEE-FOLLOWUP-ENTRY-LAYOUT-PARITY-HARD-FIX-001

| Area | Before Problem | After Fix |
|---|---|---|
| Header | too large/inconsistent | compact/parity controls |
| Nav | not centered | centered two-tab switcher |
| Boss card | mostly acceptable but needed parity | Entry-style card + compact default |
| System reminders | old style | Entry KPI grid + Entry cards |
| Reminder cards | old red cards and always-expanded forms | collapsed Entry form cards |

## Density Decisions

Primary information:

- Bed / title
- Amount
- Overdue/status
- Main action: expand details

Secondary information:

- Status select
- Promise date
- Note
- Save follow-up
- Go collect rent

Collapsed by default:

- System reminder form controls
- Longer notes/details

Removed from default:

- Long debug-style source metadata
- CID/deposit/internal card references
- Always-visible large form areas

Safety: no production write, no write gate, no migration, no deploy.

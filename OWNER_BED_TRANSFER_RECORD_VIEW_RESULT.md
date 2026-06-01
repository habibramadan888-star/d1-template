# Owner Bed Transfer Record View Result

Date: 2026-06-01

## Result

The owner view now presents Bed Transfer as read-only event records.

| Owner Surface | Result |
|---|---|
| `GET /api/owner/bed-transfers` | Returns record-only transfers |
| `status=recorded` filter | Includes `recorded` and legacy `pending_review` rows |
| Overview card | `Bed Transfer Records / 换床记录` |
| Record count label | `Recorded events` |
| Approve/reject buttons | Not present |
| Readonly admin | Read-only |
| Production cutover | `PRODUCTION_NO_GO` |

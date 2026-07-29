# Owner Arrears API Contract Final Check

Endpoint used by overview: `GET /api/arrears/followup/tasks?limit=5`.

The endpoint returns standard response data containing `tasks`, summary counts, source status, and source authority. The UI also tolerates legacy array responses and partial/missing fields through fallbacks.

| Field | API Provides | UI Requires | Match | Fallback |
| --- | --- | --- | --- | --- |
| `total_amount_fils` | yes | yes | yes | recompute from visible rows if absent |
| `total_count` | yes | yes | yes | `tasks.length` |
| `existing_arrears_count` | yes | yes | yes | count rows with `existing_arrears_record` |
| `ttlock_expired_unpaid_count` | yes, initially `0` for server read; frontend hydrates TTLock | yes | yes | count frontend TTLock rows |
| `employee_promised_count` | yes | yes | yes | count rows with promise fields |
| `recent_tasks` | yes | optional | yes | first five `tasks` |
| `customer_code` | yes per task | yes | yes | `tenant_card_id`, `tenant_name`, or blank |
| `room_bed` | yes per task | yes | yes | `bed`, `room`, or blank |
| `amount_fils` | yes per mapped task | yes | yes | derive from `remain` |
| `due_date` | yes per task when available | yes | yes | empty date displays neutral copy |
| `overdue_days` | yes | yes | yes | frontend recomputes from `due_date` |
| `source_type` | yes | yes | yes | unsupported sources are filtered out |
| `followup_status` | yes | yes | yes | business-label fallback |
| `assigned_employee_name` | not guaranteed | optional | acceptable | display “待分配” |
| `promised_amount_fils` | yes | yes | yes | `promise_amount * 100` |
| `promised_payment_date` | yes | yes | yes | `promise_date` |
| `followup_note` | yes | yes | yes | `staff_note` or “暂无” |

Contract rules:

- Missing fields must not create infinite loading.
- Empty data returns the empty state.
- Partial data renders with a source warning.
- Missing bed rent excludes only the relevant TTLock card and does not fail the whole module.

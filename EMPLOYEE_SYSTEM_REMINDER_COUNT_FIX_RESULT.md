# Employee System Reminder Count Fix Result

Date: 2026-06-01

| Check | Result |
|---|---|
| System Reminders counts by active `source_type` | PASS |
| `ttlock_expired_unpaid` counted as TTLock Overdue | PASS |
| `existing_arrears_record` counted as Arrears | PASS |
| TTLock rows excluded from Arrears count | PASS |
| Boss Assigned count remains separate | PASS |
| Production write | NO |
| Write gate | OFF |
| Production cutover | PRODUCTION_NO_GO |

Implementation:

- Added `normalizeEmployeeReminderSourceType()`.
- Added `isEmployeeTtlockReminder()` and `isEmployeeSystemArrearsReminder()`.
- Preserved `source_type:'ttlock_expired_unpaid'` on TTLock reminder rows.
- Updated `historyFollowupItems()` to keep materialized TTLock tasks as `source:'ttlock'`.
- Updated `renderTasks()` KPI buckets to use the source helpers instead of legacy display buckets.

Expected internal QA outcome for the current 46 Abdul dispatch: TTLock Overdue = 41 and Arrears = 5 when the employee system reminder list is populated from the same current SOT rows.

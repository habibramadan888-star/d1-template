# Employee System Reminder Count Source Audit

Date: 2026-06-01

Scope: employee FOLLOW-UP page only. No production write, no write gate, no migration, no deploy.

| Area | Current Finding | Root Cause | Required Fix |
|---|---|---|---|
| Boss Assigned count | Uses `/api/employee/arrears/directives` persisted directives. Count is separate and can show `46 ASSIGNED`. | Correct source for assigned directives. | Keep separate from System Reminders. |
| System Reminders TTLock count | Materialized TTLock arrears from `arrear_tasks` could be collapsed into `source:'history'`. | `historyFollowupItems()` ignored `source_type` and assigned every persisted arrear task to `history` / `history_unmatched`. | Normalize active `source_type`; classify `ttlock_expired_unpaid` as TTLock. |
| System Reminders Arrears count | TTLock materialized rows could be counted as Arrears. | `renderTasks()` counted by `item.source`, not normalized business source. | Count Arrears with `isEmployeeSystemArrearsReminder()`, explicitly excluding TTLock. |
| Current expected source split | `existing_arrears_record = 5`, `ttlock_expired_unpaid = 41`. | Production current SOT real dispatch source split. | System Reminders source counters must preserve this split when those rows are loaded. |
| Production safety | No production writes needed for this UI/count fix. | Static UI classification only. | Keep write gate off and production cutover `PRODUCTION_NO_GO`. |

Conclusion: the count mismatch was a front-end source classification issue. The fix must use normalized `source_type`, not the legacy `history` display bucket.

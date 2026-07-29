# NEXT PROMPT: P0-006Q2 Create Staging Audit / Entry Event Evidence Rows

进入 TASK P0-006Q2：Create staging-only audit_logs / entry_events evidence rows.

当前状态：

P0-006Q completed with `NEEDS_STAGING_EVIDENCE_DATA`.

Missing evidence:

1. `audit_logs` owner-created event with `owner_id` scope.
2. `audit_logs` scoped void/delete_session event.
3. `entry_events` scoped `session_void` event.

目标：

只对 `homelink-finance-staging` 创建 staging-only QA evidence rows，补齐
audit/event tenant/property scope evidence。

必须人工明确批准：

- `--confirm-staging-audit-event-evidence-write`
- `--confirm-backup`
- `--confirm-rollback`
- `--confirm-qa-run-id`

严格禁止：

1. production deploy
2. production migration
3. production D1 write
4. production URL call
5. production cutover
6. secret commit
7. password/token/cookie print
8. P0-006 marked Verified

要求：

1. Target D1 must be `homelink-finance-staging`.
2. Target D1 ID must be `4ff78bfc-3855-436b-aefb-6b492145d79c`.
3. Backup required before write.
4. Rollback plan required before write.
5. Every QA row must include `qa_run_id`.
6. Rows must be staging-only evidence rows.
7. No dashboard or financial formula impact.
8. After write, rerun `npm run rehearse:tenant-audit-events`.
9. P0-006 remains Partial.

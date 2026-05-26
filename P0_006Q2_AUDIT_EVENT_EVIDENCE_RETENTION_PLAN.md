# P0-006Q2 Audit/Event Evidence Retention Plan

Date: 2026-05-26, Asia/Dubai

QA run id: `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26`

Source marker: `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE`

## Retention Decision

The staging QA evidence rows should be retained until P0-006 staging QA signoff
because they prove tenant/property scope coverage for `audit_logs` and
`entry_events`.

## Rows Written

| Table          | QA Evidence Rows | Retain Until              |
| -------------- | ---------------: | ------------------------- |
| `audit_logs`   |                5 | P0-006 staging QA signoff |
| `entry_events` |                6 | P0-006 staging QA signoff |

## Cleanup Draft

Cleanup must be a separate staging-only task with backup and explicit approval.
Draft only, not executed:

```sql
-- staging-only cleanup draft; do not run without explicit approval and backup
DELETE FROM audit_logs
WHERE id LIKE 'p0-006q2-%'
  AND detail LIKE '%P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE%';

DELETE FROM entry_events
WHERE event_id LIKE 'p0-006q2-%'
  AND new_value LIKE '%P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE%';
```

Cleanup requirements:

- Backup required before cleanup.
- Cleanup must target `homelink-finance-staging` only.
- Cleanup must not target production.
- Cleanup must not touch business tables.
- Cleanup was not executed in this task.

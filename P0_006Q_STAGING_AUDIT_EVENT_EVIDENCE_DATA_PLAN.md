# P0-006Q Staging Audit / Event Evidence Data Plan

Date: 2026-05-26, Asia/Dubai

Result: `NEEDS_STAGING_EVIDENCE_DATA`

No staging evidence rows were written in P0-006Q.

## Need For Staging-Only Evidence Rows

Yes. Current staging data proves some scoped employee entry and handover
audit/event rows, but it does not include all required cases:

- Owner-created audit evidence with `owner_id`.
- Scoped void/delete session audit evidence.
- Scoped `session_void` entry event evidence.

## Proposed Target Tables

| Table          | Required Evidence         | Required Scope Fields                                                                                     | QA Run ID Required | Cleanup Needed |
| -------------- | ------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------ | -------------- |
| `audit_logs`   | owner-created event       | `company_id`, `property_id`, `owner_id`, `corpid`, `role`, `action`, `target`                             | yes                | yes            |
| `audit_logs`   | void/delete_session event | `company_id`, `property_id`, `owner_id`, `corpid`, `role`, `action`, `target`                             | yes                | yes            |
| `entry_events` | session void event        | `company_id`, `property_id`, `employee_id` or `operator_id`, `corpid`, `event_type`, `ref_type`, `ref_id` | yes                | yes            |

## Required Guardrails For P0-006Q2

1. Explicit human approval to write staging evidence rows.
2. Target D1 must be `homelink-finance-staging`.
3. Target D1 ID must be `4ff78bfc-3855-436b-aefb-6b492145d79c`.
4. Backup required before write.
5. Rollback plan required before write.
6. Every row must include a `qa_run_id` marker in a safe text field or JSON
   detail.
7. No production deploy.
8. No production migration.
9. No production D1 write.
10. No dashboard or financial formula impact.

## Cleanup / Retention

Retain evidence rows until P0-006Q2 verification is reviewed. Cleanup must be a
separate staging-only action after backup and explicit approval. Do not clean
production.

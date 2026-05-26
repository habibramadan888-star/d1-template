# Tenant Scope Staging Backfill Dry-Run Result

Generated: 2026-05-26T08:27:33.638Z

Scope: read-only staging tenant scope backfill dry-run. This script confirms the staging D1 target, reads table schema/counts with SELECT only, generates draft update-plan classifications, and does not deploy, migrate, write D1 rows, call production, mutate dashboard/history output, or remove legacy CORPID fallback.

Target D1: `homelink-finance-staging` (`4ff78bfc-3855-436b-aefb-6b492145d79c`)
Overall: `PASS`

| Table                     | Row Count | Has CORPID | Has Company | Has Property | Legacy CORPID Rows | Missing Company Rows | Missing Property Rows | Draft Update Plan                             | Result          | Notes                                                                            |
| ------------------------- | --------- | ---------- | ----------- | ------------ | ------------------ | -------------------- | --------------------- | --------------------------------------------- | --------------- | -------------------------------------------------------------------------------- |
| active_sessions           | 4         | yes        | yes         | no           | 4                  | 4                    | 0                     | DRAFT_BACKFILL_REQUIRED_AFTER_SCHEMA_APPROVAL | LEGACY_WARNING  | Legacy-scoped table needs approved schema/backfill task; no write generated now. |
| app_settings              | 0         | yes        | yes         | yes          | 0                  | 0                    | 0                     | NO_UPDATE_REQUIRED                            | PASS            | No staging backfill update is needed for this dry-run row set.                   |
| arrear_tasks              | 7         | yes        | yes         | yes          | 7                  | 7                    | 7                     | MANUAL_REVIEW_REQUIRED_BEFORE_BACKFILL        | MANUAL_REQUIRED | Manual mapping/reconciliation required before any staging write.                 |
| arrears                   | 0         | yes        | yes         | yes          | 0                  | 0                    | 0                     | NO_UPDATE_REQUIRED                            | PASS            | No staging backfill update is needed for this dry-run row set.                   |
| audit_logs                | 7         | yes        | yes         | yes          | 7                  | 7                    | 7                     | MANUAL_REVIEW_REQUIRED_BEFORE_BACKFILL        | MANUAL_REQUIRED | Manual mapping/reconciliation required before any staging write.                 |
| deposit_ledger            | 0         | yes        | yes         | yes          | 0                  | 0                    | 0                     | NO_UPDATE_REQUIRED                            | PASS            | No staging backfill update is needed for this dry-run row set.                   |
| entry_events              | 5         | yes        | yes         | yes          | 5                  | 5                    | 5                     | MANUAL_REVIEW_REQUIRED_BEFORE_BACKFILL        | MANUAL_REQUIRED | Manual mapping/reconciliation required before any staging write.                 |
| handover_audit_events     | 3         | no         | yes         | yes          | 0                  | 0                    | 0                     | NO_UPDATE_REQUIRED                            | PASS            | No staging backfill update is needed for this dry-run row set.                   |
| handover_commit_rows      | 2         | no         | yes         | yes          | 0                  | 0                    | 0                     | NO_UPDATE_REQUIRED                            | PASS            | No staging backfill update is needed for this dry-run row set.                   |
| handover_commits          | 1         | no         | yes         | yes          | 0                  | 0                    | 0                     | NO_UPDATE_REQUIRED                            | PASS            | No staging backfill update is needed for this dry-run row set.                   |
| handover_idempotency_keys | 1         | no         | yes         | yes          | 0                  | 0                    | 0                     | NO_UPDATE_REQUIRED                            | PASS            | No staging backfill update is needed for this dry-run row set.                   |
| sessions                  | 1         | yes        | yes         | yes          | 1                  | 1                    | 1                     | MANUAL_REVIEW_REQUIRED_BEFORE_BACKFILL        | MANUAL_REQUIRED | Manual mapping/reconciliation required before any staging write.                 |
| transactions              | 3         | yes        | yes         | yes          | 3                  | 3                    | 3                     | MANUAL_REVIEW_REQUIRED_BEFORE_BACKFILL        | MANUAL_REQUIRED | Manual mapping/reconciliation required before any staging write.                 |

Summary:

- Tables reviewed: 13.
- Blocked tables: 0.
- Manual-required tables: 5.
- Legacy-warning tables: 1.
- Draft write-plan classifications: 6.

Command safety:

- SAFE_TO_RUN_NOW for any generated write plan: no.
- NEEDS_HUMAN_APPROVAL for any staging write: yes.
- WRITES_SCHEMA: no.
- WRITES_DATA: no.
- PRODUCTION_FORBIDDEN: yes.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging D1 write: no.
- D1 command type: read-only SELECT.
- Dashboard/history live result changed: no.
- Production auth behavior changed: no.
- Legacy CORPID fallback removed: no.
- Secret/password/token/cookie printed: no.

Production meaning:

- P0-006 remains Partial, not Verified.
- This dry-run does not approve staging writes or production migration.
- Production remains blocked until backup, rollback, live query wiring, and human tenancy decisions are approved.

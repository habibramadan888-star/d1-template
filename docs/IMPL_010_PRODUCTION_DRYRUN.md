# IMPL-010 Production Dry-Run and Rehearsal Plan

Generated: 2026-05-29
Scope: dry-run plan only. No production copy created, no D1 command executed, no deploy.

## Required Environment

- Production-copy database, created by approved DevOps process only.
- Worker deployed to a non-production dry-run environment.
- Feature flags enabled only in dry-run/staging.
- Sanitized logs and no password/token/cookie output.

## Dry-Run Scenarios

| Scenario | Required Result |
|---|---|
| Backend totals | Returns integer-fils totals plus computation metadata. |
| Receivables lifecycle | Created -> pending -> partial -> paid with ledger events. |
| Tenant isolation | Cross-tenant and cross-property rows filtered/denied. |
| Handover atomicity | Same idempotency key replays; duplicate session rejected. |
| Audit trail | Success and failure events recorded without secrets. |
| Readonly admin | Reads allowed; all writes 403. |
| History performance | First page under target with limit/offset. |

## Sign-Off Requirements

- Finance signs money precision and receivables behavior.
- Engineering signs backend authority and rollback readiness.
- QA signs real-device read-only smoke.
- Owner/CEO signs final production approval.

## Forbidden During Dry-Run

- Production D1 writes.
- Production migration.
- D1 export/import/execute against production.
- Employee entry write against production.
- Handover submit against production.
- Void/delete/settings mutation against production.

## Exit Criteria

| Item | Required |
|---|---|
| All dry-run scenarios pass | Yes |
| Rollback rehearsed | Yes |
| Real-device QA complete | Yes |
| Production approval | Separate explicit approval |
| Production state | PRODUCTION_NO_GO until approved |

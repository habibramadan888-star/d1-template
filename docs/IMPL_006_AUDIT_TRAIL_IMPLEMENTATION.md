# IMPL-006 Audit Trail Complete Implementation Plan

Generated: 2026-05-29
Scope: implementation plan. No D1 write, no mutation tests.

## Current Evidence

| Area | Evidence | Status |
|---|---|---|
| Generic audit | Worker has `audit(env, user, action, target, detail)`. | Present. |
| Handover audit | Staging handover route writes `handover_audit_events`. | Present. |
| Entry events | `entry_events` exists for accepted/rejected evidence. | Present. |
| Full old/new mutation audit | Generic audit does not yet prove complete old/new coverage for all mutations. | Gap. |

## Required Audit Fields

| Field | Required |
|---|---|
| event id | Yes |
| tenant/company id | Yes |
| property id | Where applicable |
| user id | Yes |
| role | Yes |
| operation | Yes |
| resource type/id | Yes |
| old value | Updates/voids/deletes |
| new value | Creates/updates |
| changed fields | Updates |
| idempotency key | Retryable writes |
| result status | Success/failure |
| timestamp | Yes |

## Mutation Coverage List

- Employee entry create.
- Arrear task create/update/clear.
- Customer/client credit save.
- Settings update.
- Session void/delete.
- Handover commit.
- Deposit ledger movement.
- Receivable state transition.

## Implementation Steps

1. Expand audit helper contract without logging secrets or raw credentials.
2. Add before/after snapshots to update/void flows.
3. Link idempotency keys for retryable writes.
4. Add read-only audit query endpoint for owner/readonly_admin.
5. Add tests for success and failed mutation audit events.
6. Add retention/export policy before production cutover.

## Exit Criteria

| Item | Required |
|---|---|
| All mutations audited | Yes |
| Failed writes audited safely | Yes |
| No secrets in audit logs | Yes |
| Query endpoint scoped | Yes |
| Production state | PRODUCTION_NO_GO until signed off |

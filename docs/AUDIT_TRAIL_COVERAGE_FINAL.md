# Audit Trail Coverage Final Specification

Generated: 2026-05-29
Scope: static specification and code audit. No D1 write, no mutation tests.

## Current Evidence

| Area | Evidence | Current State |
|---|---|---|
| Generic audit | Worker has `audit(env, user, action, target, detail)` and writes `audit_logs`. | Present but compact. |
| Entry events | `entry_events` table exists and staging handover writes accepted events. | Present. |
| Handover audit | `handover_audit_events` exists for staging handover attempts/accepts. | Present. |
| Full old/new tracking | Generic `audit_logs` does not yet show complete old/new field schema. | Gap. |

## Required Coverage

| Mutation | Required Audit |
|---|---|
| employee entry create | user, tenant, property, entry id, normalized payload summary |
| arrear task create/update/clear | old state, new state, amount, reason |
| customer/client credit save | count, actor, scope, changed payload digest |
| settings update | old value, new value, actor, approval context |
| session void/delete | old status, new status, affected rows, request id |
| handover commit | idempotency key, backend totals, rows accepted/rejected |
| deposit ledger movement | before balance, delta, after balance, reason |

## Required Audit Schema

| Field | Required |
|---|---|
| `event_id` | Yes |
| `tenant_id/company_id` | Yes |
| `property_id` | Yes where applicable |
| `user_id` | Yes |
| `role` | Yes |
| `operation` | Yes |
| `resource_type` | Yes |
| `resource_id` | Yes |
| `old_value` | Required for updates/voids |
| `new_value` | Required for creates/updates |
| `changed_fields` | Required for updates |
| `idempotency_key` | Required for retryable writes |
| `created_at` | Yes |

## Decision

| Item | Result |
|---|---|
| Generic audit exists | Yes |
| Handover audit exists | Yes, staging path |
| Full mutation audit complete | No |
| Production cutover | PRODUCTION_NO_GO |

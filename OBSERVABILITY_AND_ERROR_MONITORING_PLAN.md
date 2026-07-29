# Observability And Error Monitoring Plan

Generated: 2026-05-25T03:42:25+04:00

Scope: commercial readiness plan for Worker logs, structured errors, audit events, and operational monitoring. This plan does not connect a third-party service and does not add secrets.

## Objectives

| Objective                   | Required Behavior                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| Trace every request         | Every API response and log should carry a `request_id`                                           |
| Protect PII/secrets         | Logs must redact passwords, tokens, TTLock secrets, WiFi passwords, phone numbers where possible |
| Trace financial mutations   | Every financial write/void/adapter rehearsal must emit audit evidence                            |
| Separate staging/production | `APP_ENV` must be visible in structured logs and never guessed                                   |
| Enable incident triage      | Errors must include stable error codes, route, role, and safe entity ids                         |

## Structured Error Format

```json
{
  "ok": false,
  "error": {
    "code": "EMPLOYEE_ENTRY_ADAPTER_REJECTED",
    "message": "Staff-safe summary",
    "request_id": "req_...",
    "route": "/api/employee/entry",
    "app_env": "staging"
  }
}
```

## Logging Rules

| Field                                  | Rule                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `request_id`                           | Required for every API request                                                         |
| `user_id` / `employee_id` / `owner_id` | Log only stable internal ids; avoid raw phone/password/token                           |
| `role`                                 | Log role when authenticated                                                            |
| `company_id` / `property_id`           | Required after P0-006; until then log `corpid` as legacy scope                         |
| `session_id` / `transaction_id`        | Allowed for audit traceability                                                         |
| Money values                           | Prefer `*_fils`; legacy decimal only in audit/reconciliation context                   |
| Error detail                           | Keep raw stack out of client response; server logs may include stack in non-production |

## Audit Event Coverage

| Event                                | Required Evidence                                                           |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `delete_session` void                | actor, target session, void reason/source, affected rows, timestamp         |
| Employee entry adapter prevalidation | actor, payload class, accepted/rejected state, money warnings/errors        |
| Handover atomic staging commit       | idempotency key, accepted/rejected rows, backend totals, discrepancy status |
| Money reconciliation gate            | scan id, mismatches, invalid values, manual-required rows                   |
| Receivable lifecycle                 | future event id, amount due/paid/remaining, allocation/adjustment reason    |
| Tenant scope denial                  | actor, attempted company/property, denied reason                            |

## Cloudflare Worker Logs

- Use Cloudflare Worker logs for request/error events.
- Avoid logging secrets from `env` or request headers.
- Use consistent `console.log(JSON.stringify(...))` for operational events.
- Use `console.error(JSON.stringify(...))` for unexpected failures.
- Do not rely on logs as the accounting ledger; database audit rows remain authoritative.

## Alert Strategy

| Severity | Example                                                                                          | Action                         |
| -------- | ------------------------------------------------------------------------------------------------ | ------------------------------ |
| P0       | Financial write failed after partial acceptance, auth bypass, production feature flag unexpected | Immediate owner/engineer alert |
| P1       | Reconciliation mismatch, repeated 5xx, D1 write failures, idempotency conflict surge             | Same-day investigation         |
| P2       | Legacy warning count high, validation rejection spike, staging drift warning                     | Backlog and weekly review      |
| P3       | Formatting/readiness report warning                                                              | Routine cleanup                |

## Retention Recommendation

| Data                       | Retention                            |
| -------------------------- | ------------------------------------ |
| Financial audit rows       | Long-term; do not hard delete        |
| Worker operational logs    | 30-90 days depending Cloudflare plan |
| Staging test logs          | 14-30 days, no real tenant secrets   |
| Security/auth failure logs | 90 days minimum where feasible       |

## Go-Live Requirements

1. Request ids exist on all sensitive routes.
2. Financial mutations write audit evidence.
3. Staging and production log behavior are separated.
4. Secret scan passes.
5. Error responses are structured and staff-safe.
6. Alert ownership is assigned.

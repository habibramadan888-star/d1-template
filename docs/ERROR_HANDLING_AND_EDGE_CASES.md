# Error Handling And Edge Cases

Status: implementation guidance, not a completed migration.

Production status: `PRODUCTION_NO_GO`.

## Purpose

This document defines the target error-handling shape for the finance Worker and records current edge-case expectations. It does not claim that all endpoints already return a unified error envelope.

## Target Error Envelope

All new or migrated endpoints should return a consistent JSON shape:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERR_100",
    "message": "Missing required field",
    "details": {
      "field": "amount"
    }
  },
  "metadata": {
    "timestamp": "2026-05-30T00:00:00.000Z",
    "requestId": "req_example",
    "version": "1.0"
  }
}
```

## Proposed Error Code Ranges

| Range               | Category            | Examples                                            |
| ------------------- | ------------------- | --------------------------------------------------- |
| `ERR_100`-`ERR_199` | Input validation    | Missing field, invalid amount, invalid date         |
| `ERR_200`-`ERR_299` | Authentication      | Missing token, invalid session, expired token       |
| `ERR_300`-`ERR_399` | Authorization       | Role denied, tenant denied, property denied         |
| `ERR_400`-`ERR_499` | Business rules      | Invalid state transition, duplicate idempotency key |
| `ERR_500`-`ERR_599` | Data consistency    | Ledger mismatch, rollback failure, audit failure    |
| `ERR_600`-`ERR_699` | System availability | Database unavailable, timeout, rate limit           |

## Current Implementation Notes

- The Worker currently has existing JSON helpers and many route-specific error responses.
- A dedicated `StandardResponse<T>` contract is not yet proven across all endpoints.
- A central `ERR_xxx` registry is not yet wired into handlers.
- Audit and observability support exists, but a full structured logger migration is still a follow-up task.

## Required Edge Cases

| Area               | Required Behavior                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| Money              | Reject unsafe decimals, non-integers, `NaN`, `Infinity`, empty values, and unsupported negative amounts. |
| Tenant isolation   | Ignore frontend-supplied tenant IDs and derive scope from authenticated claims.                          |
| Property isolation | Deny employee access outside assigned properties.                                                        |
| Receivable state   | Reject invalid transitions and preserve ledger evidence.                                                 |
| Handover           | Reject frontend total mismatches and require idempotency.                                                |
| Audit              | Do not log passwords, raw tokens, secrets, or raw SQL containing sensitive values.                       |
| Availability       | Return safe client messages without exposing raw database internals.                                     |

## Migration Checklist

- [ ] Add a central error-code registry.
- [ ] Add typed helpers for success and failure envelopes.
- [ ] Migrate one route family at a time behind tests.
- [ ] Add compatibility tests for legacy response consumers.
- [ ] Add tests that assert no sensitive values appear in error responses.
- [ ] Update API documentation after routes are migrated.

## Non-Claims

- This document does not approve production deployment.
- This document does not prove all endpoints are already standardized.
- This document does not replace real Phase 3 production-copy execution or manual sign-offs.

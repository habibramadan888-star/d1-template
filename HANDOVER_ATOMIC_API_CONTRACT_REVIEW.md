# Handover Atomic API Contract Review

Generated: 2026-05-24, Asia/Dubai

Scope: final review recommendation for a future staging/local-only endpoint. No live endpoint was implemented.

## Recommended Contract

| Item                 | Recommendation                                                                       |
| -------------------- | ------------------------------------------------------------------------------------ |
| Method               | `POST`                                                                               |
| Path                 | `POST /api/staging/handover/commit`                                                  |
| Future live path     | `POST /api/employee/handover/commit` after separate approval                         |
| Feature flag         | `ENABLE_HANDOVER_ATOMIC_STAGING=true`                                                |
| Environment guard    | `APP_ENV` must be `development`, `local`, or `staging`; production disabled          |
| Auth                 | Required server-side JWT/session auth                                                |
| Allowed roles        | `employee`, `staff`                                                                  |
| Disallowed submitter | `owner`, `manager`, `admin`                                                          |
| Idempotency          | Required body field `idempotency_key`; future header `Idempotency-Key` may mirror it |
| Accounting authority | Backend recomputed totals from accepted rows                                         |
| Frontend totals      | Comparison input only                                                                |
| Audit                | Attempt and accepted/rejected outcome must be persisted in staging audit path        |

## Request Body

```json
{
  "session_id": "S20260524-EMP01",
  "idempotency_key": "hk_20260524_emp01_001",
  "employee_id": "abdul",
  "property_id": "HL-009",
  "submitted_at": "2026-05-24T03:00:00+04:00",
  "expected_row_count": 2,
  "frontend_totals": {
    "cash_handover": "640.00",
    "bank_transfer_total": "0.00",
    "bank_transfer_count": 0,
    "gross_received": "640.00",
    "session_total": "640.00"
  },
  "rows": [
    {
      "client_entry_id": "row-001",
      "event_type": "R",
      "payment_method": "C",
      "amount": "640.00",
      "bed": "144",
      "period_start": "2026-06-01",
      "period_end": "2026-07-01"
    }
  ]
}
```

## Response Body

```json
{
  "status": "ACCEPTED",
  "commit_accepted": true,
  "idempotency_status": "NEW",
  "session_id": "S20260524-EMP01",
  "backend_totals": {
    "cash_handover_fils": 64000,
    "cash_handover_aed": "640.00",
    "bank_transfer_total_fils": 0,
    "bank_transfer_total_aed": "0.00",
    "gross_received_fils": 64000,
    "gross_received_aed": "640.00",
    "session_total_fils": 64000,
    "session_total_aed": "640.00",
    "bank_transfer_count": 0
  },
  "frontend_total_comparison": {
    "matches": true,
    "deltas": []
  },
  "accepted_rows": 1,
  "rejected_rows": 0,
  "audit_events": ["handover_commit_attempt", "handover_commit_accepted"]
}
```

## Error Codes

| Code                         |       HTTP | Meaning                                                                              |
| ---------------------------- | ---------: | ------------------------------------------------------------------------------------ |
| `FEATURE_DISABLED`           | 404 or 403 | Feature flag is off or production disabled.                                          |
| `UNAUTHENTICATED`            |        401 | Missing or invalid login.                                                            |
| `FORBIDDEN`                  |        403 | Actor role or property/employee scope is not allowed.                                |
| `OWNER_SUBMIT_REJECTED`      |        403 | Owner/admin attempted to submit employee handover.                                   |
| `INVALID_REQUEST`            |        400 | Missing session, employee, property, idempotency key, submitted time, or rows.       |
| `INVALID_AMOUNT`             |        422 | Amount cannot be parsed exactly into AED fils.                                       |
| `VOIDED_ROW_REJECTED`        |        422 | Voided row was submitted as active handover row.                                     |
| `FRONTEND_TOTAL_DISCREPANCY` | 409 or 422 | Frontend totals differ from backend recompute. Recommended staging behavior: reject. |
| `IDEMPOTENCY_CONFLICT`       |        409 | Same key was reused with a different request fingerprint.                            |
| `DUPLICATE_HANDOVER_RISK`    |        409 | Same rows appear under a different idempotency key.                                  |

## Example Responses

### 1. Normal Submit

```json
{
  "status": "ACCEPTED",
  "commit_accepted": true,
  "idempotency_status": "NEW",
  "backend_totals": {
    "session_total_aed": "640.00"
  },
  "frontend_total_comparison": {
    "matches": true
  }
}
```

### 2. Idempotent Replay

```json
{
  "status": "IDEMPOTENT_REPLAY",
  "commit_accepted": true,
  "idempotency_status": "IDEMPOTENT_REPLAY",
  "message": "Same idempotency key and payload already accepted."
}
```

### 3. Frontend Totals Tampered

```json
{
  "status": "FRONTEND_TOTAL_DISCREPANCY",
  "commit_accepted": false,
  "backend_totals": {
    "session_total_aed": "640.00"
  },
  "frontend_total_comparison": {
    "matches": false,
    "deltas": [
      {
        "field": "session_total",
        "frontend_aed": "600.00",
        "backend_aed": "640.00",
        "delta_aed": "40.00"
      }
    ]
  }
}
```

### 4. Weak Network Duplicate

```json
{
  "status": "DUPLICATE_HANDOVER_RISK",
  "commit_accepted": false,
  "idempotency_status": "DUPLICATE_WARNING",
  "message": "Same rows were submitted under a different idempotency key."
}
```

### 5. Voided Row Rejection

```json
{
  "status": "VOIDED_ROW_REJECTED",
  "commit_accepted": false,
  "rejected_rows": [
    {
      "client_entry_id": "row-001",
      "reason": "VOIDED_ROW_REJECTED"
    }
  ]
}
```

### 6. Unauthorized Employee

```json
{
  "status": "FORBIDDEN",
  "code": "UNAUTHORIZED_EMPLOYEE_SCOPE",
  "message": "Employee is outside allowed handover scope."
}
```

### 7. Owner Submit Rejected

```json
{
  "status": "FORBIDDEN",
  "code": "OWNER_SUBMIT_REJECTED",
  "message": "Owner/admin cannot submit employee handover."
}
```

### 8. Feature Flag Disabled

```json
{
  "status": "FEATURE_DISABLED",
  "message": "Atomic handover staging endpoint is disabled."
}
```

### 9. Production Disabled

```json
{
  "status": "FEATURE_DISABLED",
  "message": "Atomic handover staging endpoint is not available in production."
}
```

## Rate Limit And Logging

1. The route should use the same auth and rate-limit strategy as other sensitive employee APIs.
2. Idempotency key must not bypass rate limits.
3. Logs should include request id, actor id, role, property id, session id, idempotency status, commit status, and error code.
4. Logs must not include secrets, JWTs, raw passwords, or full sensitive payloads.

## Review Verdict

The contract is suitable for a staging/local-only implementation after human approval. It is not suitable for production until money minor units, tenant scope, backend totals live authority, receivables lifecycle, and rollback strategy are approved.

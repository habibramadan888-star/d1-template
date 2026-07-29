# Handover Atomic API Contract

Generated: 2026-05-24, Asia/Dubai

Scope: future endpoint contract. P0-002B does not wire this route into the live Worker.

## Endpoint

| Item                 | Contract                                                                            |
| -------------------- | ----------------------------------------------------------------------------------- |
| Method               | `POST`                                                                              |
| Path                 | `/api/employee/handover/commit`                                                     |
| Auth                 | Required server-side JWT/session auth                                               |
| Allowed role         | `employee` / `staff` assigned to the target tenant/property                         |
| Disallowed submitter | `owner`, `manager`, `admin` for staff handover submit; they may inspect/report only |
| Idempotency key      | Required in body and future header support: `idempotency_key`                       |
| Accounting authority | Backend recomputed totals from accepted rows                                        |
| Client totals        | Comparison input only                                                               |

## Request Body

```json
{
  "session_id": "S20260524-EMP01",
  "idempotency_key": "handover_commit_...",
  "employee_id": "abdul",
  "property_id": "HL-009",
  "submitted_at": "2026-05-24T03:00:00+04:00",
  "expected_row_count": 8,
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
  "session_id": "S20260524-EMP01",
  "idempotency_status": "NEW",
  "accepted_rows": 8,
  "rejected_rows": 0,
  "backend_totals": {
    "cashHandoverAed": "640.00",
    "bankTransferTotalAed": "0.00",
    "grossReceivedAed": "640.00",
    "sessionTotalAed": "640.00",
    "bankTransferCount": 0
  },
  "frontend_total_comparison": {
    "matches": true
  },
  "audit_event_ids": ["audit-..."],
  "entry_event_ids": ["entry-..."]
}
```

## Error Codes

| Code                         |               HTTP | Meaning                                                                           |
| ---------------------------- | -----------------: | --------------------------------------------------------------------------------- |
| `UNAUTHENTICATED`            |                401 | Missing or invalid login.                                                         |
| `FORBIDDEN`                  |                403 | Authenticated user is outside employee/property scope or owner tries to submit.   |
| `INVALID_REQUEST`            |                400 | Missing session, idempotency key, employee, property, submitted time, or rows.    |
| `INVALID_AMOUNT`             |                422 | Amount cannot be parsed exactly to AED fils.                                      |
| `FRONTEND_TOTAL_DISCREPANCY` |         409 or 422 | Client totals differ from backend recompute. Final live behavior requires review. |
| `IDEMPOTENCY_CONFLICT`       |                409 | Same key submitted with different payload.                                        |
| `DUPLICATE_HANDOVER_RISK`    | 409 or 202 warning | Same rows submitted under a different idempotency key.                            |
| `VOIDED_ROW_REJECTED`        |                422 | Voided row was included in handover commit.                                       |

## Behavioral Rules

1. The backend validates auth and scope before validating financial rows.
2. The backend normalizes rows and recomputes totals in integer fils.
3. The backend compares frontend totals but never trusts them as authority.
4. Same idempotency key + same fingerprint returns original result without duplicate writes.
5. Same idempotency key + different fingerprint returns conflict.
6. Weak-network retry must be safe with the same key.
7. Voided rows cannot be recommitted as active handover rows.
8. Every attempt writes or plans `handover_commit_attempt`.
9. Accepted commits write accepted audit and entry events.
10. Rejected commits write rejected audit and row reason events.

## Migration From Legacy Endpoint

1. Keep `/api/employee/entry` unchanged during rehearsal.
2. Add `/api/employee/handover/commit` behind staging-only route or feature flag.
3. Run dual comparison: legacy row uploads vs atomic commit draft.
4. Verify backend totals equal approved handover summaries.
5. Enable the endpoint in staging after P0-001C/P0-003/P0-006/P0-008 dependencies are approved or explicitly scoped.
6. Production rollout requires separate approval and rollback plan.

## Rollback

- Keep legacy row upload/export flow until staging proves atomic commit stability.
- Disable new route/feature flag if discrepancy or idempotency errors exceed threshold.
- Preserve audit/discrepancy reports for accounting review.

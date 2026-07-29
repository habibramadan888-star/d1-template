# Handover Atomic Commit Design

Generated: 2026-05-24, Asia/Dubai

Scope: P0-002A design only. No production endpoint was added or wired.

## Proposed Endpoint

| Item               | Design                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Path               | `POST /api/employee/handover/commit`                                                                                  |
| Caller             | Authenticated employee assigned to the property; future owner/admin may inspect but should not submit staff handover. |
| Request authority  | Rows and anchors are submitted by employee; accounting totals are recomputed by backend.                              |
| Response authority | Backend returns accepted row count, recomputed totals, idempotency status, audit ids, and export summary.             |

## Request Body

```json
{
  "session_id": "S20260524-001",
  "idempotency_key": "handover_commit_...",
  "employee_id": "abdul",
  "property_id": "HL-009",
  "submitted_at": "2026-05-24T03:00:00+04:00",
  "client_totals": {
    "cash_handover": "640.00",
    "bank_transfer_total": "0.00",
    "bank_transfer_count": 0,
    "gross_received": "640.00"
  },
  "rows": [
    {
      "client_entry_id": "row-1",
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

## Backend Acceptance Rules

1. Require server-side authentication and employee property membership.
2. Require `idempotency_key`, `session_id`, `employee_id`, `submitted_at`, and non-empty `rows`.
3. Reject rows with unsafe money values using the money helper.
4. Normalize every row into integer fils before writing commercial tables.
5. Recompute `cash_handover`, `bank_transfer_total`, `bank_transfer_count`, and `gross_received`.
6. Compare client totals to backend totals for audit; client totals are not authority.
7. Write session, transactions, receivables/arrears as applicable, and audit events in one accepted plan.
8. If the same idempotency key is replayed with identical payload, return the original accepted result.
9. If the same idempotency key is replayed with different payload, return conflict.
10. If any row fails validation, reject the whole handover before writing.
11. Void compatibility requires every row to share the final `session_id`.

## Relationship To Other P0 Work

| Dependency             | Relationship                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| P0-001 money precision | Commit must parse and store integer fils before becoming production authority.                    |
| P0-003 backend totals  | Commit must recompute totals backend-side and ignore client totals as authority.                  |
| P0-004 void session    | Commit rows must remain void-compatible and auditable.                                            |
| P0-006 tenancy         | Commit must scope by tenant/company/property, not static CORPID alone.                            |
| P0-008 receivables     | Short rent and repayments should produce/allocate receivables, not only operational arrear tasks. |

## Duplicate And Weak-Network Behavior

| Scenario                             | Required Behavior                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| First submit succeeds                | Return `accepted: true`, accepted row count, recomputed totals, and audit ids. |
| Network drops after backend commit   | Retry with same idempotency key returns original accepted result.              |
| Retry with changed rows and same key | Return `409 idempotency_conflict`; do not write new rows.                      |
| Partial row validation failure       | Reject entire commit before writing.                                           |
| Void after commit                    | Void marks session-linked records and audit events remain visible.             |

## Current Status

Only `modules/employees/handover-atomic-contract.mjs` and `tests/handover-atomic.design.spec.mjs` were added as design guardrails. They are not wired to the Worker.

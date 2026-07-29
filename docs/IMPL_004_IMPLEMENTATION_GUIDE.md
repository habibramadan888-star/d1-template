# IMPL-004: Handover Atomic Transaction Implementation Guide

Status: ready for implementation.

Owner: Backend Lead.

Duration: 1.5 to 2 hours.

Risk: high, data consistency.

## Objective

Make handover commits atomic, idempotent, and auditable.

## Required Components

### Idempotency Table

Prepare migration draft only until staging execution is approved:

```sql
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  response TEXT NOT NULL,
  expires_at TEXT DEFAULT (datetime('now', '+24 hours')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Handler Requirements

- Require idempotency key.
- Check idempotency before executing write path.
- Recompute cash and bank totals backend-side.
- Reject submitted-total mismatch before commit.
- Wrap handover record, entry updates, audit log, and idempotency save in a transaction.
- Roll back on any failure.
- Return cached result for duplicate idempotency key.

## Tests to Write

- Normal handover creates exactly one handover and marks all entries.
- Duplicate key returns cached result.
- Network failure leaves no partial handover.
- Retry after failure is safe.
- Frontend/backend total mismatch rejects and rolls back.

## Definition of Done

- No partial handovers possible.
- Idempotency tested.
- Rollback tested.
- Audit evidence exists.
- Staging validation passes.

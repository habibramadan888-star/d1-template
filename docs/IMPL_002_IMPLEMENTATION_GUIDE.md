# IMPL-002: Receivables State Machine Implementation Guide

Status: ready for implementation.

Owner: Backend Lead.

Duration: 3 to 4 hours.

Risk: high, core business logic.

## Objective

Implement validated receivable states, ledger-backed transitions, and oldest-first payment allocation.

## Schema Work

Prepare migration drafts only until staging execution is approved:

```sql
ALTER TABLE receivables ADD COLUMN status TEXT DEFAULT 'PENDING';

CREATE TABLE IF NOT EXISTS receivables_ledger (
  id TEXT PRIMARY KEY,
  receivable_id TEXT NOT NULL,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  payment_id TEXT,
  allocated_amount INTEGER,
  reason TEXT,
  approved_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_ledger_receivable_id ON receivables_ledger(receivable_id);
```

## State Rules

Allowed states:

- `CREATED`
- `PENDING`
- `PARTIAL`
- `PAID`
- `VOIDED`
- `ADJUSTED`
- `WRITTEN_OFF`

Allowed transitions:

| From        | To                                           |
| ----------- | -------------------------------------------- |
| CREATED     | PENDING                                      |
| PENDING     | PARTIAL, PAID, VOIDED, ADJUSTED, WRITTEN_OFF |
| PARTIAL     | PARTIAL, PAID, VOIDED, ADJUSTED, WRITTEN_OFF |
| PAID        | none without approved reversal design        |
| VOIDED      | PENDING only through approved restoration    |
| ADJUSTED    | none without new approval                    |
| WRITTEN_OFF | none without new approval                    |

## Implementation Checklist

- Validate transition before mutation.
- Wrap transition and ledger insert in transaction.
- Write ledger entry for every transition.
- Require approval fields for adjustment and write-off.
- Keep money in integer fils.
- Use oldest due date first for allocation.
- Reject unsafe or ambiguous money values.

## Tests to Write

- `PENDING` to `PARTIAL`.
- `PENDING` to `PAID`.
- `PARTIAL` to `PAID`.
- Invalid `PAID` transition rejected.
- Adjustment requires approval.
- Write-off requires approval.
- Oldest-first allocation.
- Ledger insert rollback on failure.

## Definition of Done

- All states implemented.
- Invalid transitions rejected.
- Ledger evidence complete.
- Payment allocation deterministic.
- Staging validation passes.

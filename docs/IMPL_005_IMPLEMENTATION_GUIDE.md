# IMPL-005: Runtime DDL Cleanup Implementation Guide

Status: ready for implementation.

Owner: DevOps Lead.

Duration: 1.5 hours.

Risk: low, but startup-critical.

## Objective

Remove runtime schema creation from Worker startup and replace it with schema verification. Migrations should own schema changes.

## Implementation Checklist

- Inventory runtime `CREATE TABLE`, `ALTER TABLE`, and `CREATE INDEX`.
- Move required DDL to migration drafts.
- Keep runtime code read-only for schema verification.
- Fail clearly if a required table or index is missing.
- Keep local development bootstrap separate from production Worker startup.

## Verification Function Shape

```javascript
export async function verifySchema(db) {
  const requiredTables = ["payments", "entries", "receivables", "audit_logs"];

  for (const table of requiredTables) {
    const result = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .bind(table)
      .first();

    if (!result) {
      throw new Error(`Missing required table: ${table}`);
    }
  }
}
```

## Tests to Write

- Fresh DB with migrations verifies successfully.
- Missing table fails startup check.
- Running migrations twice remains idempotent.
- Production Worker source has no runtime DDL.

## Definition of Done

- Runtime DDL removed or gated to local-only bootstrap.
- Schema verification works.
- Migration plan reviewed.
- Staging startup passes.

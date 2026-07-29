# DELETE SQL Scan

Date: 2026-05-23  
Task: P0-004 `/api/delete_session` void / soft-delete conversion  
Production deploy: not executed  
Production database mutation: not executed

## Command Evidence

```text
rg -n "DELETE\s+FROM" deploy-worker\src\index.js deploy-worker\src\index.embedded.js migrations migration-drafts scripts tests modules
```

Result:

```text
tests\source-risk.spec.mjs:192:    /\b(INSERT|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE)\b/i
tests\source-risk.spec.mjs:202:  assert.match(worker, /\bREAL\b|DELETE FROM/i);
scripts\audit-legacy-backfill.mjs:92:  "DELETE FROM transactions",
```

## Findings

| File                                  | Line/Area             | SQL                        | Table                                                                   | Is Financial | Allowed? | Notes                                                                                                   |
| ------------------------------------- | --------------------- | -------------------------- | ----------------------------------------------------------------------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------- |
| `deploy-worker/src/index.js`          | `/api/delete_session` | none                       | `sessions`, `transactions`, `deposit_ledger`, `arrears`, `arrear_tasks` | Yes          | Yes      | Normal delete path now uses void metadata updates and audit events instead of hard delete.              |
| `deploy-worker/src/index.embedded.js` | `/api/delete_session` | none                       | `sessions`, `transactions`, `deposit_ledger`, `arrears`, `arrear_tasks` | Yes          | Yes      | Generated embedded Worker matches source behavior after regeneration.                                   |
| `scripts/audit-legacy-backfill.mjs`   | line 92               | `DELETE FROM transactions` | `transactions`                                                          | Yes          | Yes      | Static scanner pattern string only; it is not executed SQL and exists to detect unsafe legacy patterns. |
| `tests/source-risk.spec.mjs`          | lines 192, 202        | `DELETE FROM`              | n/a                                                                     | No           | Yes      | Regex/test text only; not executed against D1.                                                          |

## Commercial Interpretation

- No normal Worker business path currently contains `DELETE FROM sessions`, `DELETE FROM transactions`, `DELETE FROM deposit_ledger`, or `DELETE FROM arrears`.
- `/api/delete_session` now preserves rows and marks them voided.
- Remaining `DELETE FROM` strings are audit/test patterns, not executable business SQL.
- P0-004 can only be marked Verified if local delete-session void tests, full check, and smoke pass.

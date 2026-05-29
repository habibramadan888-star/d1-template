# IMPL-005 Runtime DDL Cleanup Plan

Generated: 2026-05-29
Scope: implementation plan. No migration executed, no D1 write.

## Current Runtime DDL Classes

The Worker contains runtime schema mutation patterns:

- `CREATE TABLE IF NOT EXISTS active_sessions`
- `CREATE TABLE IF NOT EXISTS employee_users`
- `CREATE TABLE IF NOT EXISTS audit_logs`
- `CREATE TABLE IF NOT EXISTS sessions`
- `CREATE TABLE IF NOT EXISTS arrear_tasks`
- `CREATE TABLE IF NOT EXISTS entry_events`
- `CREATE TABLE IF NOT EXISTS deposit_ledger`
- `CREATE TABLE IF NOT EXISTS app_settings`
- `ALTER TABLE ... ADD COLUMN ...`
- `CREATE INDEX IF NOT EXISTS ...`

## Target State

| Area | Target |
|---|---|
| Production Worker request path | No schema mutation |
| Local dev bootstrap | Explicit local-only setup command |
| Staging schema | Migration-controlled |
| Production schema | Reviewed migration only |
| Worker runtime | Schema verification only |

## Implementation Steps

1. Export active runtime DDL into migration files.
2. Compare migration DDL with `migrations/local/*.sql`.
3. Add schema verifier that checks required tables/columns/indexes.
4. Gate dev bootstrap behind non-production env only.
5. Remove or disable runtime DDL from production request paths.
6. Run `npm run audit:db:check` and runtime DDL gate tests.

## Rollback

- Keep current Worker runtime DDL branch available until migration path is verified.
- If schema verification blocks staging unexpectedly, disable strict verifier only in staging, never silently in production.

## Exit Criteria

| Item | Required |
|---|---|
| Runtime DDL removed/gated | Yes |
| Schema verifier present | Yes |
| Fresh local bootstrap documented | Yes |
| Migration executed | Not in this task |
| Production state | PRODUCTION_NO_GO until signed off |

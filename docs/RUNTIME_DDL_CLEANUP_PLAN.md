# Runtime DDL Cleanup Plan

Generated: 2026-05-29
Scope: plan only. No migration executed, no D1 write, no deploy.

## Current Runtime DDL Evidence

The Worker still contains runtime DDL:

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

These statements are mostly idempotent, but runtime schema mutation remains a production governance risk.

## Target State

| Item | Target |
|---|---|
| Schema creation | Migration files only |
| Runtime request path | No schema mutation |
| Fresh local dev | Explicit local setup script |
| Production D1 | Migration reviewed and applied separately |
| Worker startup | Assumes schema already exists |

## Cleanup Sequence

1. Extract active runtime DDL into reviewed migration files.
2. Add schema drift check that fails if Worker requires missing tables/columns.
3. Keep local bootstrap behind explicit dev-only command, not request path.
4. Remove or hard-disable runtime DDL for production.
5. Run `npm run audit:db:check` and schema readiness gates.

## Decision

| Item | Result |
|---|---|
| Runtime DDL present | Yes |
| Cleanup implemented | No |
| Migration executed | No |
| Production cutover | PRODUCTION_NO_GO |

# Bed Transfer Production Schema Live Readiness Check

Date: 2026-06-01, Asia/Dubai

Scope: production read-only schema metadata check for Bed Transfer real-write readiness.

## Commands

```powershell
npx wrangler --version
npx wrangler d1 execute homelink --remote --config wrangler.toml --command "PRAGMA table_info(bed_transfer_events);"
npx wrangler d1 execute homelink --remote --config wrangler.toml --command "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='bed_transfer_events' ORDER BY name;"
```

## Result

| Check | Result |
|---|---|
| Wrangler version | 4.94.0 |
| Production D1 database | homelink |
| `bed_transfer_events` table columns | none returned |
| `bed_transfer_events` indexes | none returned |
| D1 rows written | 0 |
| Production migration executed | No |
| Production write executed | No |

## Required Production Write Schema

| Capability / Field | Production Status |
|---|---|
| `bed_transfer_events` table | MISSING |
| `from_bed` | MISSING |
| `to_bed` | MISSING |
| `transfer_date` | MISSING |
| customer / tenant anchor | MISSING |
| deposit carry-over | MISSING |
| arrears carry-over | MISSING |
| old / new TTLock refs | MISSING |
| audit / trace linkage | MISSING |
| status | MISSING |
| reason | MISSING |
| operator | MISSING |

## Readiness Decision

`PRODUCTION_SCHEMA_MIGRATION_REQUIRED_BEFORE_REAL_WRITE`

Production is not ready for any real Bed Transfer write or smoke write. The UI-only deploy may proceed because the production Bed Transfer save/export path is explicitly disabled and returns the approval-required message instead of writing.

Production cutover remains `PRODUCTION_NO_GO`.

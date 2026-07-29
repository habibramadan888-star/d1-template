# Runtime DDL Migration Plan

Status: P1-002A plan only. Production deployment: not executed. Production D1 migration: not executed.

## Goal

Move schema mutation out of Worker request paths and into reviewed migrations. Runtime DDL currently remains for legacy compatibility and should not be deleted automatically.

## Current Runtime DDL Categories

| Category        | Current Location                                  | Covered By Migration                 | Runtime Still Needed?                      | Risk | Recommendation                                                    |
| --------------- | ------------------------------------------------- | ------------------------------------ | ------------------------------------------ | ---- | ----------------------------------------------------------------- |
| Auth sessions   | `deploy-worker/src/index.js`, `index.embedded.js` | Covered by local bootstrap           | Yes, for legacy production compatibility   | P1   | Keep until production migration process exists.                   |
| Employee users  | Worker employee login/seed path                   | Covered by local bootstrap           | Yes, for dev seed and legacy compatibility | P1   | Keep until dev seed and employee auth tables are migration-owned. |
| Audit logs      | Worker audit helper                               | Covered by local bootstrap           | Yes                                        | P1   | Keep until audit model is unified and migrated.                   |
| Employee schema | `empEnsureSchema` tables and columns              | Partially covered by local bootstrap | Yes                                        | P1   | Move to reviewed migrations after P0-001/P0-008 schema decisions. |
| Runtime indexes | `CREATE INDEX IF NOT EXISTS` in `empEnsureSchema` | Covered by local bootstrap           | Yes                                        | P2   | Remove only after migration drift check proves indexes exist.     |
| App settings    | Multiple request handlers create `app_settings`   | Covered by local bootstrap           | Yes                                        | P1   | Move to migration-owned company/property settings in P0-006/P1.   |

## Removal Order

| Order | Scope                                                               | Required Precondition                                      | Verification                                                      |
| ----- | ------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| 1     | Keep current runtime DDL and add static audit.                      | Current stage.                                             | `npm run audit:runtime-ddl` outputs `RUNTIME_DDL_STATIC_SCAN.md`. |
| 2     | Promote reviewed local bootstrap into a production migration draft. | Human approval, backup, staging D1, rollback.              | Staging migration rehearsal.                                      |
| 3     | Add schema drift check endpoint/script for staging only.            | Migration applied in staging.                              | Drift report shows required tables/columns/indexes.               |
| 4     | Gate runtime DDL behind a legacy compatibility flag.                | Staging proves schema exists without runtime creation.     | Worker starts and smoke passes with runtime DDL disabled.         |
| 5     | Remove runtime DDL from source and embedded Worker.                 | Production migration has been applied and rollback exists. | `audit:runtime-ddl` returns zero Worker runtime DDL findings.     |

## Dependencies

- P0-001: Money fields should not be promoted permanently as `REAL`.
- P0-006: Tenant/property scope affects final table definitions.
- P0-008: Receivables model affects final accounting schema.
- P1 staging/production separation: runtime DDL removal must first be tested in staging.

## No-Go Conditions

- Do not remove runtime DDL while production schema is not migration-owned.
- Do not apply migration automatically from Codex.
- Do not run remote D1 migration without backup and human approval.
- Do not use runtime DDL to hide a failed migration in production.

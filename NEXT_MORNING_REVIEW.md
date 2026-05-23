# Next Morning Review

Date: 2026-05-23  
Night Shift mode: V2 commercial audit and safe engineering  
Production deploy: not executed  
Production database mutation: not executed

## What Was Completed

- Governance and project map documents exist and were checked.
- Engineering baseline exists: npm scripts, ESLint, Prettier, env examples, README, governance check.
- Local static validation now passes.
- Worker dry-run build passes for both assets Worker and embedded Worker configs.
- Local Worker startup passed on port 8793.
- Smoke check passed:
  - `GET /employee-v3.html` returned 200.
  - `GET /index-51.html` returned 200.
  - `GET /api/me` returned 401 when unauthenticated.
- Browser-level first-load checks passed:
  - employee login screen visible.
  - owner login screen visible.
- API, database, finance, auth/tenancy, employee flow, owner flow, manual test, and commercialization backlog reports were created or updated.

## Files Modified Or Added

- `deploy-worker/src/index.js`
- `eslint.config.mjs`
- `.gitignore`
- `.env.local.example`
- `package.json`
- `package-lock.json`
- `scripts/smoke-worker.mjs`
- `scripts/audit-api.mjs`
- `scripts/audit-db.mjs`
- `tests/governance.spec.mjs`
- `tests/source-risk.spec.mjs`
- `API_INVENTORY.md`
- `DATABASE_AUDIT.md`
- `FINANCE_AUDIT.md`
- `AUTH_TENANCY_AUDIT.md`
- `EMPLOYEE_FLOW_REPORT.md`
- `OWNER_FLOW_REPORT.md`
- `MANUAL_TEST_PLAN.md`
- `COMMERCIALIZATION_BACKLOG.md`
- `NEXT_MORNING_REVIEW.md`
- `RUN_REPORT.md`
- `NIGHT_SHIFT_REPORT.md`
- `BLOCKER_REPORT.md`

## Commands Passing

```bash
npm run governance:check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run smoke
npm run check
```

`npm run test` result:

```text
tests 6
pass 6
fail 0
```

## Commands Or Flows Not Fully Verified

- Employee entry/export workflow: authenticated login now passes; entry/export still not fully tested.
- Owner dashboard workflow: authenticated login now passes; dashboard APIs still not fully tested.
- TTLock live integration: not validated in V2.
- D1 clean commercial bootstrap: not proven.
- Mobile authenticated employee/owner workflows: not fully verified in V2.

## P0 Issues To Review First

1. Financial money model uses `REAL` / JS `Number`.
2. Employee handover commit is not backend-atomic.
3. Backend stores frontend-provided handover totals.
4. Hard delete exists for financial session data.
5. Clean D1 bootstrap/migration chain is incomplete or unproven.
6. Tenant/property isolation is not SaaS-ready.
7. Full authenticated employee entry/export and owner dashboard tests are still pending.
8. No formal receivables lifecycle exists.

## P1 Issues To Review Next

1. Runtime schema mutation in request paths.
2. Audit model is split and incomplete.
3. Rent config lacks effective dates.
4. Date/timezone rules need server-side centralization.
5. Default employee seed behavior must be dev-only.
6. Embedded Worker generated source may drift from source Worker.
7. Staging/production separation needs a concrete checklist.

## What You Should Check First Tomorrow

1. Review `COMMERCIALIZATION_BACKLOG.md` P0 list.
2. Review authenticated smoke output and decide whether to proceed to employee entry/export E2E.
3. Decide whether the next engineering task is:
   - auth test enablement, or
   - hard-delete to void workflow, or
   - clean migration design.
4. Open employee and owner pages locally and run the remaining manual tests in `MANUAL_TEST_PLAN.md`.

## What Must Not Be Auto-Fixed

- Production database schema or data.
- Production Cloudflare deployment.
- Financial calculation formula changes.
- Auth/tenant model rewrite.
- Deleting historical financial records.
- Rebuilding `src/index.embedded.js` unless explicitly approved for deploy preparation.

## Recommended Next Instruction

Run authenticated employee entry/export E2E against local D1 only, then validate created session, transaction, arrear task, deposit ledger, and audit rows.

## Authenticated Smoke Follow-Up

Local non-production `.dev.vars` has now been configured and authenticated smoke passed:

```text
PASS owner login 200
PASS owner /api/me 200
PASS owner role manager
PASS owner /api/history 200
PASS owner /api/rent_config 200
PASS employee login 200
PASS employee /api/me 200
PASS employee role staff
PASS employee denied owner history 403
PASS employee allowed rent config 200
```

The previous blocker for basic local authentication is now cleared for smoke coverage. Full employee entry/export and owner dashboard workflows are still not validated.

## Employee Entry Smoke Follow-Up

`npm run smoke:employee-entry` was added and executed. It failed:

```text
FAIL employee entry expected 200, got 500
```

Local D1 schema confirmed `transactions` is missing. This is now a confirmed P0 clean bootstrap blocker. The next safe engineering step is to design a proper migration that creates `transactions`; do not fix it by manually creating ad hoc local tables in request handling.

The non-executable migration design has been started in `MIGRATION_BOOTSTRAP_PLAN.md`, with field-level target schema in `MIGRATION_SCHEMA_CONTRACT.md`.

## Commercial Migration Draft Follow-Up

Created `migration-drafts/002_commercial_bootstrap.sql` as a non-executable commercial bootstrap draft. It defines the target SaaS/accounting foundation tables without applying them to any database.

Static validation was added in `tests/migration-draft.spec.mjs` and included in `npm run typecheck` / `npm run test`.

Latest full check:

```text
npm run check
PASS
tests 11
pass 11
fail 0
```

No production deployment or database migration was executed.

The draft was also syntax-validated against an isolated disposable local D1 directory using `wrangler d1 execute --local --persist-to <temp-dir>`. It executed 32 SQL commands successfully and created the expected commercial bootstrap tables. The temp directory was removed after validation.

Next safe step is a human review of the migration/backfill/rollback plan before moving any SQL into the real `migrations/` directory.

## Migration Promotion Gate Follow-Up

Added `MIGRATION_PROMOTION_CHECKLIST.md` as the required gate before any SQL draft can be moved into executable migrations.

The checklist requires:

- financial safety,
- tenant/property isolation,
- audit and soft-delete behavior,
- legacy compatibility mapping,
- backfill dry-run,
- rollback test,
- staging validation,
- production cutover controls,
- post-migration monitoring,
- no-go conditions.

No database or Worker runtime change was made.

## Migration Rehearsal Follow-Up

Added `npm run migration:rehearse`.

The script:

- creates a disposable local D1 directory,
- applies `migration-drafts/002_commercial_bootstrap.sql`,
- verifies all core commercial tables,
- inserts a representative accounting chain,
- verifies session, transaction, receivable, payment, arrear task, deposit ledger, and audit event rows,
- removes the temporary local D1 directory.

The rehearsal passed locally. It does not touch remote D1, existing local D1 state, production config, or executable migrations.

Important finding: D1 rejects SQL `BEGIN TRANSACTION` / `ROLLBACK` through `wrangler d1 execute`, so rollback rehearsal is represented by disposable local D1 cleanup. Production rollback still requires backup restore or forward rollback migration planning.

## Legacy Backfill Mapping Follow-Up

Added `LEGACY_BACKFILL_MAP.md` and `npm run audit:legacy-backfill`.

The mapping now explicitly covers:

- `corpid` to `company_id` / `property_id`,
- `sessions` to `handover_sessions`,
- `transactions` to `transactions`, `payments`, and `receivables`,
- `arrears` to `receivables` and `arrear_tasks`,
- `deposit_ledger` to commercial deposit liability ledger,
- `entry_events` / `audit_logs` to `audit_events`,
- employee identity and settings migration risks.

The audit is read-only. It does not connect to D1 and does not execute SQL.

## Legacy Reconciliation Template Follow-Up

Added `LEGACY_RECONCILIATION_SPEC.md` and `npm run reconciliation:template`.

Generated template files:

- `reconciliation-templates/legacy-reconciliation-report.template.json`
- `reconciliation-templates/legacy-reconciliation-report.template.md`
- `reconciliation-templates/legacy-reconciliation-exceptions.template.csv`

These define the future dry-run output shape for source counts, target counts, money totals, session reconciliation, receivable reconciliation, deposit balance reconciliation, audit coverage, idempotency, exceptions, and no-go conditions.

No D1 connection was opened and no SQL/backfill was executed.

## Local Legacy Reconciliation Dry-Run Follow-Up

Added `npm run reconciliation:dry-run`.

Safety behavior:

- requires explicit `--persist-to`,
- rejects `--remote` and `--preview`,
- uses Wrangler D1 only with `--local`,
- writes generated reports under ignored `reconciliation-output/`,
- performs read-only table/count/money-total queries,
- does not execute write SQL or backfill.

Validation used an empty disposable local D1 directory. It completed with 9 expected missing-table exceptions and no P0 no-go. A real reconciliation still requires a reviewed local/staging D1 copy.

## API Inventory Drift Gate Follow-Up

Added reproducible API inventory generation and check mode.

What changed:

- `npm run audit:api` regenerates `API_INVENTORY.md` from Worker route scanning plus route metadata.
- `npm run audit:api:check` fails if `API_INVENTORY.md` is stale.
- `npm run check` now includes the API inventory drift gate.

Current verification:

```text
npm run check passed
tests 20 / pass 20
Worker dry-run builds passed
```

Remaining limitation: this is a local gate. Hosted CI must run `npm run check` before any commercial deploy or merge.

## Database Static Scan Drift Gate Follow-Up

Added reproducible database static scanning without overwriting the manual database audit.

What changed:

- `npm run audit:db` now writes `DATABASE_STATIC_SCAN.md`.
- `npm run audit:db:check` fails if `DATABASE_STATIC_SCAN.md` is stale.
- `npm run check` now includes the database static scan drift gate.
- `DATABASE_AUDIT.md` remains the manual commercial audit document.

Current verification:

```text
npm run check passed
tests 21 / pass 21
Worker dry-run builds passed
```

Remaining limitation: this is still static source scanning. It does not replace a reviewed staging D1 reconciliation run.

## Authenticated Core Smoke Script Follow-Up

Added `npm run smoke:core`.

Purpose:

- verify unauthenticated API rejection,
- verify owner login and owner read APIs,
- verify employee login and employee-allowed APIs,
- verify employees are rejected from owner-only reads/writes.

Important limitation:

- It is not part of default `npm run check` because it requires a running Worker plus ignored local/staging secrets.
- It was run once locally and passed all listed permission checks.
- It should be run against staging before commercial deploys.

# Run Report

Date: 2026-05-23  
Mode: NIGHT SHIFT local validation  
Scope: governance, engineering baseline, local startup checks  
Production deploy: not executed  
Production database mutation: not executed

## Summary

Local static/Worker startup is viable. The engineering baseline now exists, but full validation is blocked by legacy lint errors and missing local authentication secrets.

## Commands Executed

### Governance

Command:

```bash
npm run governance:check
```

Result:

```text
Governance check passed.
```

Status: PASS

### Dependency Install

Command:

```bash
npm install
```

Result:

```text
added 122 packages
found 0 vulnerabilities
```

Status: PASS

### Typecheck / Syntax Check

Command:

```bash
npm run typecheck
```

Result:

```text
node --check deploy-worker/src/index.js
node --check deploy-worker/scripts/build-embedded-worker.js
node --check index-51-main.js
```

Status: PASS

### Format Check

Command:

```bash
npm run format:check
```

Result:

```text
All matched files use Prettier code style.
```

Status: PASS

### Build Dry Run

Command:

```bash
npm run build
```

Result:

```text
wrangler deploy --config wrangler.toml --dry-run
wrangler deploy --config wrangler.embedded.toml --dry-run
```

Status: PASS

Notes:

- Assets Worker dry-run upload size: 109.22 KiB / gzip 22.93 KiB
- Embedded Worker dry-run upload size: 1031.46 KiB / gzip 303.38 KiB
- No production deployment was executed.

### Lint

Command:

```bash
npm run lint
```

Status: FAIL

Errors:

```text
deploy-worker/src/index.js
  752:38  no-control-regex
  986:1   no-irregular-whitespace

index-51-main.js
  2372:10 Parsing error: Identifier 'rc_renderCfg' has already been declared
```

Assessment:

- These are existing legacy code issues.
- They were not auto-fixed because that would touch business/legacy logic.
- The duplicate declaration in owner-side code needs a dedicated small fix after review.

### Local D1 Connection

Command:

```bash
npx wrangler d1 execute homelink --local --config deploy-worker/wrangler.toml --command "SELECT type,name FROM sqlite_master WHERE type IN ('table','index') ORDER BY type,name;"
```

Status: PASS

Observed local tables/indexes:

```text
_cf_METADATA
active_sessions
employee_users
sqlite_autoindex_active_sessions_1
sqlite_autoindex_employee_users_1
```

Risk:

- Clean local D1 does not show full business schema.
- Current runtime/migration path does not prove clean commercial bootstrap.

### Local Worker Startup

Command:

```bash
cd deploy-worker
npx wrangler dev --config wrangler.toml --port 8793
```

Status: PASS

Checks:

```text
GET /employee-v3.html 200
GET /index-51.html    200
GET /api/me           401
```

Expected:

- `GET /api/me` returns 401 when unauthenticated.

Login check:

```text
POST /auth/employee-login 503
Error: jwt_secret_missing
```

Status: FAIL

Reason:

- Local secrets are missing.
- `.env.example` was created, but real local `.dev.vars` was not created because it must contain developer-provided secrets.

### Embedded Worker Startup

Command:

```bash
cd deploy-worker
npx wrangler dev --config wrangler.embedded.toml --port 8794
```

Status: PASS

Checks:

```text
GET /                 200
GET /employee-v3.html 200
GET /index-51.html    200
```

## Error Categories

### Startup Errors

- No startup error for static pages.
- Authenticated employee flow blocked by missing `JWT_SECRET`.

### Build Errors

- No dry-run build error.

### API Errors

- `/api/me` unauthenticated returns 401 correctly.
- `/auth/employee-login` returns 503 locally because `JWT_SECRET` is missing.

### Permission Errors

- Not fully validated because login cannot complete without local secrets.
- Server-side auth gate is present for unauthenticated access.

### D1 Errors

- D1 local connection works.
- Clean bootstrap schema is incomplete or not proven.

### Cloudflare Errors

- Wrangler dev and dry-run deploy worked locally.
- No production deploy was attempted.

## Next Safe Actions

1. Create a real local `.dev.vars` from `.env.example` using non-production secrets.
2. Add a password-hash generation helper for local setup.
3. Fix lint blockers in isolated changes:
   - Worker control-regex lint handling
   - Worker irregular whitespace
   - owner-side duplicate `rc_renderCfg`
4. Build a clean D1 migration chain before any commercial onboarding.

## NIGHT SHIFT V2 Update

Date: 2026-05-23

### Safe Fixes Applied

- Updated ESLint parsing boundaries so legacy browser scripts and Worker module code are checked with the correct source type.
- Fixed Worker lint blockers caused by control-character regex handling and an irregular invisible character.
- Added non-invasive smoke/audit scripts:
  - `scripts/smoke-worker.mjs`
  - `scripts/audit-api.mjs`
  - `scripts/audit-db.mjs`
- Added `.env.local.example` as a safe local-only template.
- Added `audit:api`, `audit:db`, and `smoke` npm scripts.

### V2 Commands Passing

```bash
npm run governance:check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run check
npm run smoke
```

### V2 Smoke Result

Local Worker on port 8793:

```text
GET /employee-v3.html 200
GET /index-51.html    200
GET /api/me           401
```

### Remaining Runtime Gaps

- Authenticated employee/owner flows still require local non-production secrets.
- D1 clean commercial bootstrap is still not proven.
- Embedded Worker generated source was not regenerated because expanding generated giant files is prohibited during this audit.

### Added Test Layer

Command:

```bash
npm run test
```

Result:

```text
tests 6
pass 6
fail 0
```

Coverage:

- governance reports exist and are non-empty,
- commercial blockers are explicitly tracked,
- `.env.local` / `.dev.vars` protection exists,
- root npm Cloudflare deploy commands remain dry-run only,
- Worker auth gate remains present,
- known financial risks remain documented while business logic is not modified.

### Port Cleanup

After local smoke, the leftover local Worker child process on port 8793 was stopped. Final port state showed only `TimeWait`, not an active listener.

## Employee Entry Smoke Update

Date: 2026-05-23

Command:

```bash
npm run smoke:employee-entry
```

Result:

```text
FAIL employee entry expected 200, got 500
```

Local D1 read-only schema check showed these business tables after the failed attempt:

```text
active_sessions
arrear_tasks
deposit_ledger
employee_users
entry_events
sessions
```

`transactions` was missing.

Assessment:

- `/api/employee/entry` depends on `transactions`.
- `empEnsureSchema` creates `sessions`, `arrear_tasks`, `entry_events`, and `deposit_ledger`, but does not create `transactions` on a clean local D1.
- The existing migration alters `transactions` but does not create it.

Status: FAIL / P0 clean bootstrap blocker.

Decision:

- Do not apply ad hoc SQL to create `transactions`.
- Do not bypass the endpoint.
- Fix requires an explicit clean migration design and regression test.

## Authenticated Smoke Update

Date: 2026-05-23

### Local Secret Setup

- Created `deploy-worker/.dev.vars` with local-only random credentials.
- The file is ignored by Git and must not be committed.
- Credentials were rotated after an accidental terminal display of the first generated local-only values.

### Local D1 Test Data

The existing local D1 `employee_users` row for `abdul` had been seeded with an older password salt. After rotating `PW_SALT`, employee login failed with `invalid_employee_pin`.

Resolution:

- Ran a Wrangler `d1 execute --local` update against local D1 only.
- Updated the local test employee PIN hash to match the current local `PW_SALT`.
- No remote D1 command was executed.

### Commands

```bash
npm run smoke
npm run smoke:auth
```

### Results

```text
PASS employee page 200
PASS owner page 200
PASS unauthenticated api 401
PASS owner login 200
PASS owner /api/me 200
PASS owner role manager
PASS employee login 200
PASS employee /api/me 200
PASS employee role staff
PASS employee denied owner history 403
```

Status: PASS

### Scope Confirmed

- Owner authentication works locally with non-production secrets.
- Employee authentication works locally with non-production secrets.
- Employee cannot access the owner history API.
- Local Worker port 8793 was cleaned up after testing.

### Extended Authenticated Smoke Result

The authenticated smoke script was expanded and passed these additional checks:

```text
PASS owner /api/history 200
PASS owner /api/rent_config 200
PASS employee allowed rent config 200
```

## Commercial Migration Draft Update

Date: 2026-05-23

### Files Added Or Updated

- Added non-executable SQL draft: `migration-drafts/002_commercial_bootstrap.sql`
- Added static validation: `tests/migration-draft.spec.mjs`
- Updated `package.json` so `npm run typecheck` checks the migration draft test.
- Updated `MIGRATION_BOOTSTRAP_PLAN.md` and `DATABASE_AUDIT.md` to reference the draft.

### Safety Scope

- The SQL file is stored under `migration-drafts/`, not executable `migrations/`.
- No `wrangler d1 migrations apply` command was run.
- No `wrangler d1 execute --remote` command was run.
- No production database mutation was executed.

### Validation

Command:

```bash
npm run check
```

Result:

```text
Governance check passed.
Format check passed.
Lint passed.
Typecheck passed.
Node test passed: tests 11, pass 11, fail 0.
Worker assets dry-run build passed.
Worker embedded dry-run build passed.
```

Status: PASS

### Remaining Gap

The migration draft has been statically validated and syntax-validated against an isolated disposable local D1 directory. It still must not be promoted into the real `migrations/` chain until the backfill/rollback plan is reviewed.

### Isolated D1 Syntax Validation

Command:

```bash
wrangler d1 execute homelink --local --persist-to <temp-dir> --config wrangler.toml --file ../migration-drafts/002_commercial_bootstrap.sql --yes
```

Result:

```text
32 commands executed successfully.
```

Verification query showed the expected new core tables:

```text
companies
properties
users
property_memberships
beds
bed_rent_config_versions
handover_sessions
transactions
receivables
payments
arrear_tasks
deposit_ledger
audit_events
schema_migrations
```

Safety:

- Used `--local`.
- Used a disposable `--persist-to` directory under the OS temp folder.
- Removed the temp folder after validation.
- Did not touch remote D1.
- Did not touch the existing project local D1 state.

## Migration Promotion Gate Update

Date: 2026-05-23

### Files Added Or Updated

- Added `MIGRATION_PROMOTION_CHECKLIST.md`.
- Updated `MIGRATION_BOOTSTRAP_PLAN.md` and `DATABASE_AUDIT.md` to reference the promotion gate.
- Extended `tests/migration-draft.spec.mjs` to require promotion safety gates.

### Purpose

The SQL draft must not move from `migration-drafts/` into executable `migrations/` until backup, rollback, backfill, tenant isolation, audit, and financial reconciliation requirements are reviewed.

### Database Impact

None. No migration was executed.

### Worker Impact

None. No Worker source was changed.

### Permission Impact

None. No auth logic was changed.

## Migration Rehearsal Script Update

Date: 2026-05-23

### Files Added Or Updated

- Added `scripts/rehearse-migration.mjs`.
- Added npm script `migration:rehearse`.
- Updated static tests to ensure the rehearsal script is local-only and does not apply migrations.

### Command

```bash
npm run migration:rehearse
```

### Result

```text
Migration rehearsal passed.
Validated tables: 14
Validated accounting fixture: session, transactions, receivable, payment, arrear task, deposit ledger, audit event.
```

### Important D1 Finding

Wrangler D1 rejects SQL `BEGIN TRANSACTION` / `ROLLBACK` in SQL files. The rehearsal therefore uses a disposable local D1 state directory and removes it after validation.

### Safety Scope

- Used local D1 only.
- Used disposable `--persist-to` directory.
- Did not run `wrangler d1 execute --remote`.
- Did not run `wrangler d1 migrations apply`.
- Did not mutate existing local D1 or production D1.

## Legacy Backfill Mapping Update

Date: 2026-05-23

### Files Added Or Updated

- Added `LEGACY_BACKFILL_MAP.md`.
- Added `scripts/audit-legacy-backfill.mjs`.
- Added generated read-only report `LEGACY_BACKFILL_AUDIT.md`.
- Added npm script `audit:legacy-backfill`.
- Updated static tests to require legacy backfill mapping and audit output.

### Command

```bash
npm run audit:legacy-backfill
```

### Result

```text
Legacy backfill audit written: 0 static findings
```

### Safety Scope

- Static source scan only.
- No D1 connection opened.
- No SQL executed.
- No backfill executed.
- No production or local business data changed.

### Backfill Position

The project now has a documented mapping from legacy `sessions`, `transactions`, `arrears`, `arrear_tasks`, `deposit_ledger`, `entry_events`, `audit_logs`, `employee_users`, and `app_settings` to the commercial schema. This is still not a data reconciliation pass.

## Legacy Reconciliation Template Update

Date: 2026-05-23

### Files Added Or Updated

- Added `LEGACY_RECONCILIATION_SPEC.md`.
- Added `scripts/generate-reconciliation-template.mjs`.
- Added generated templates under `reconciliation-templates/`.
- Added npm script `reconciliation:template`.
- Updated static tests to require dry-run reconciliation sections.

### Command

```bash
npm run reconciliation:template
```

### Result

```text
Legacy reconciliation templates generated.
reconciliation-templates/legacy-reconciliation-report.template.json
reconciliation-templates/legacy-reconciliation-report.template.md
reconciliation-templates/legacy-reconciliation-exceptions.template.csv
```

### Safety Scope

- Template generation only.
- No D1 connection opened.
- No SQL executed.
- No backfill executed.
- No production or local business data changed.

### Reconciliation Coverage

The template now requires source counts, target counts, money totals in integer AED fils, session total comparison, receivable comparison, deposit balance comparison, audit coverage, tenant scope, idempotency, and P0/P1/P2/P3 exceptions.

## Local Legacy Reconciliation Dry-Run Update

Date: 2026-05-23

### Files Added Or Updated

- Added `scripts/reconcile-legacy-dry-run.mjs`.
- Added npm script `reconciliation:dry-run`.
- Updated `.gitignore` to exclude `reconciliation-output/`.
- Updated `LEGACY_RECONCILIATION_SPEC.md` with the local read-only implementation rules.
- Updated static tests to require explicit local-only behavior.

### Command

```bash
npm run reconciliation:dry-run -- --persist-to <temp-dir> --company-id company_default --property-id property_default --legacy-corpid homelink --source-label temp-empty-local
```

### Result

```text
Legacy reconciliation dry-run completed.
Tables detected: 0
Exceptions: 9
No-go: 0
```

### Safety Scope

- Used a disposable local D1 state directory.
- Removed the temporary directory after the run.
- Did not run remote D1.
- Did not execute write SQL.
- Did not backfill data.
- Wrote reports only under ignored `reconciliation-output/`.

### Current Meaning

The run used an empty temporary local D1, so the 9 exceptions are expected missing legacy-table findings. This proves the command path works and stays local; it is not a real production-data reconciliation.

## API Inventory Drift Gate Update

Date: 2026-05-23

### Files Added Or Updated

- Updated `scripts/audit-api.mjs` to generate `API_INVENTORY.md` from Worker route scanning plus route metadata.
- Added `npm run audit:api:check`.
- Added `audit:api:check` to `npm run check`.
- Updated static tests to require the route inventory drift gate.

### Command

```bash
npm run check
```

### Result

```text
API inventory is up to date.
tests 20
pass 20
build:worker:assets --dry-run passed
build:worker:embedded --dry-run passed
```

### Safety Scope

- No Worker business logic changed.
- No frontend business logic changed.
- No database operation was executed.
- No production deployment was executed.

### Current Meaning

The API inventory is now reproducible. If Worker routes change without route metadata and inventory updates, `npm run check` fails locally and should fail in CI once CI is configured.

## Database Static Scan Drift Gate Update

Date: 2026-05-23

### Files Added Or Updated

- Updated `scripts/audit-db.mjs`.
- Added generated `DATABASE_STATIC_SCAN.md`.
- Added npm script `audit:db:check`.
- Added `audit:db:check` to `npm run check`.
- Updated static tests to ensure the static scan does not overwrite `DATABASE_AUDIT.md`.

### Command

```bash
npm run check
```

### Result

```text
Database static scan is up to date.
tests 21
pass 21
build:worker:assets --dry-run passed
build:worker:embedded --dry-run passed
```

### Safety Scope

- No D1 connection was opened.
- No database mutation was executed.
- No Worker business logic changed.
- `DATABASE_AUDIT.md` remains the manual commercial database audit.

### Current Meaning

The database static scan is now reproducible and separate from the manual commercial audit. Runtime DDL, REAL/FLOAT/DOUBLE usage, and hard-delete statements remain tracked as generated findings without changing production behavior.

## Authenticated Core Smoke Script Update

Date: 2026-05-23

### Files Added Or Updated

- Added `scripts/smoke-core-flows.mjs`.
- Added npm script `smoke:core`.
- Added the script to `typecheck`.
- Added static tests to verify coverage intent.

### Coverage

The script verifies against a running local/staging Worker:

- unauthenticated `/api/me` is rejected,
- owner login works,
- owner `/api/me`, `/api/history`, and `/api/arrears` return expected JSON shapes,
- employee login works,
- employee `/api/me`, `/api/rent_config`, and `/api/arrear_tasks` are allowed,
- employee access is denied for owner-only reads and writes including `/api/delete_session` and `/api/security/revoke_sessions`.

### Safety Scope

- The script is not part of default `npm run check` because it requires a running Worker and local/staging credentials.
- No production URL is configured by default.
- No business logic changed.
- No production deployment or database migration was executed.

### Command

```bash
npm run smoke:core
```

### Result

```text
PASS unauthenticated /api/me 401
PASS owner login 200
PASS owner /api/me 200
PASS owner /api/history 200
PASS owner /api/arrears 200
PASS employee login 200
PASS employee /api/me 200
PASS employee allowed /api/rent_config 200
PASS employee allowed /api/arrear_tasks 200
PASS employee denied GET /api/history 403
PASS employee denied GET /api/arrears 403
PASS employee denied GET /api/customers 403
PASS employee denied GET /api/lock/cards 403
PASS employee denied GET /api/wifi/accounts 403
PASS employee denied POST /api/rent_config 403
PASS employee denied POST /api/save_session 403
PASS employee denied POST /api/delete_session 403
PASS employee denied POST /api/clear_arrear 403
PASS employee denied POST /api/wifi/accounts 403
PASS employee denied POST /api/customers 403
PASS employee denied POST /api/security/revoke_sessions 403
```

The local Worker was started with ignored local secrets and stopped after the smoke run. This did not deploy production.

## Commercial CI Workflow Update

Date: 2026-05-23

### Files Added Or Updated

- Added `.github/workflows/commercial-check.yml`.
- Updated static tests to verify the workflow does not reference deploy secrets or remote D1 mutation commands.
- Updated backlog to mark CI workflow creation done, with branch protection still pending.

### Workflow Behavior

The workflow runs:

```bash
npm ci
npm run check
```

It does not configure Cloudflare API tokens, does not deploy, and does not run production migrations.

### Remaining Limitation

GitHub branch protection is not configured from this local repository. Before commercial release, repository settings should require the `Commercial Check` workflow before merge/deploy.

## Secret Hygiene Gate Update

Date: 2026-05-23

### Files Added Or Updated

- Added `scripts/check-secrets.mjs`.
- Added npm script `security:secrets`.
- Added `security:secrets` to `npm run check`.
- Added static tests for the secret hygiene gate.

### Coverage

The gate checks Git-tracked files and fails if:

- `.env`, `.env.local`, `.dev.vars`, or `deploy-worker/.dev.vars` are tracked,
- secret-looking assignments such as `JWT_SECRET=...`, `TTLOCK_CLIENT_SECRET=...`, or `CLOUDFLARE_API_TOKEN=...` appear in non-example tracked files,
- example files contain non-placeholder secret values for monitored keys.

### Safety Scope

- The script does not read ignored `.dev.vars` directly unless it becomes tracked by Git.
- The script does not print secret values.
- No production configuration changed.

## Clean Worker Bootstrap Probe Update

Date: 2026-05-23

### Files Added Or Updated

- Added `scripts/probe-clean-worker-bootstrap.mjs`.
- Added npm script `probe:clean-bootstrap`.
- Added the probe script to `typecheck`.
- Added static tests to ensure the probe is local-only and not part of default `npm run check`.

### Command

```bash
npm run probe:clean-bootstrap
```

### Result

```text
Employee entry smoke exit code: 1
Caused by: Error: no such table: transactions: SQLITE_ERROR
P0 confirmed: clean local Worker bootstrap cannot complete employee entry.
```

### Safety Scope

- Started a local-only Worker with disposable D1 state.
- Used `--local` and `--persist-to`.
- Removed the temporary D1 directory after the run.
- Did not run production D1.
- Did not deploy.

### Current Meaning

The P0 clean bootstrap blocker is now reproducible. A fix is not considered valid until this command passes on a disposable clean local D1.

## Finance Minor-Unit Helper Update

Date: 2026-05-23

### Files Added Or Updated

- Added `modules/finance/money.mjs`.
- Added `tests/finance-money.spec.mjs`.
- Added module syntax checks to `npm run typecheck`.

### Why

The commercial schema requires authoritative money values as integer minor units (`*_fils`). Before wiring employee entry to commercial tables, amount parsing and arithmetic need a tested helper that rejects JavaScript floating-point input.

### Behavior

- Parses AED string input into `bigint` fils.
- Rejects JavaScript `number` input at the boundary.
- Rejects amounts with more than 2 decimal places.
- Supports explicit negative deltas only when requested.
- Provides integer-only add/subtract/max helpers.
- Converts checked `bigint` values to safe SQL integer values only at the D1 binding boundary.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No database schema was changed.
- Existing financial behavior is unchanged.

### Verification

Command:

```bash
npx prettier --write "*.md" "tools/**/*.cjs" "scripts/**/*.mjs" "tests/**/*.mjs" "modules/**/*.mjs" ".github/**/*.yml"
npm run check
```

Result:

```text
format:check passed, including modules/**/*.mjs
lint passed
typecheck passed
audit:api:check passed
audit:db:check passed
tests 31 / pass 31
Worker assets dry-run build passed
Worker embedded dry-run build passed
```

## Finance Handover Summary Helper Update

Date: 2026-05-23

### Files Added Or Updated

- Added `modules/finance/handover.mjs`.
- Added `tests/finance-handover.spec.mjs`.
- Added module and test syntax checks to `npm run typecheck`.

### Why

The employee handover screen needs three stable accounting anchors:

- cash handover,
- bank transfer total and count,
- gross received.

These values must be computed from normalized entry data with integer minor-unit money before any UI or Worker write path relies on them.

### Accounting Rules Captured

- `cashHandoverFils = cash inflows - cash deposit refunds - cash expenses`.
- `bankTransferInFils` only counts bank income entries.
- `grossReceivedFils` counts all received income and excludes refunds or expenses.
- Detail breakdowns stay separate: rent, deposit-in, arrears recovery, transfer fee, deposit refund, expense.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No database schema was changed.
- Existing runtime financial behavior is unchanged.

### Verification

Command:

```bash
npm run check
```

Result:

```text
tests 35 / pass 35
Worker assets dry-run build passed
Worker embedded dry-run build passed
```

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

## Automatic Syntax Check Gate Update

Date: 2026-05-23

### Files Added Or Updated

- Added `scripts/check-syntax.mjs`.
- Replaced manual `typecheck` file list with `node scripts/check-syntax.mjs`.
- Updated source-risk tests for the automatic scan.

### Why

The previous `typecheck` command manually listed every `.mjs` file. That is unsafe for a modular commercial codebase because new modules can be added without syntax checking. The new gate scans future module, script, test, tool, and Worker helper files automatically.

### Coverage

- `modules/**/*.mjs`
- `scripts/**/*.mjs`
- `tests/**/*.mjs`
- `tools/**/*.cjs`
- `deploy-worker/scripts/**/*.js`
- key entry files: Worker source and owner main bundle

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No database schema was changed.
- Existing runtime behavior is unchanged.

### Verification

Command:

```bash
npm run check
```

Result:

```text
Syntax check passed for 31 file(s).
tests 52 / pass 52
Worker assets dry-run build passed
Worker embedded dry-run build passed
```

## Employee Rent Entry Draft Contract Update

Date: 2026-05-23

### Files Added Or Updated

- Added `modules/employees/entry-draft.mjs`.
- Added `tests/employee-entry-draft.spec.mjs`.

### Why

The commercial write path needs one structured contract before any Worker route is changed. This rent-entry draft composes existing pure helpers into a single draft object that can later be reviewed and written server-side.

### Rules Captured

- Only rent entry is supported in this draft; other event types are rejected.
- Staff-paid amount must be an AED string and is converted to integer fils.
- Input bed must match the TTLock remark bed.
- Staff beds and vacant beds are rejected from rent entry.
- System rent period rules calculate due amount and dates.
- Short payment creates an arrears task draft with reason and promise date.
- The full TTLock remark is preserved as `tenantSnapshot` and `ttlockRemarkRaw`.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No database schema was changed.
- Existing runtime behavior is unchanged.

### Verification

Command:

```bash
npm run check
```

Result:

```text
Syntax check passed for 33 file(s).
tests 57 / pass 57
Worker assets dry-run build passed
Worker embedded dry-run build passed
```

## Commercial Entry Write Contract Update

Date: 2026-05-23

### Files Added Or Updated

- Added `COMMERCIAL_ENTRY_WRITE_CONTRACT.md`.
- Added a regression test that verifies the contract requires atomic audited server-side writes.

### Why

Before changing `/api/employee/entry`, the project needs a reviewed write contract that defines exact table writes, idempotency, audit logs, session recomputation, and failure rules.

### Contract Scope

- Employee rent collection only.
- Writes: `transactions`, `receivables`, `payments`, conditional `arrear_tasks`, `audit_events`.
- Recompute: `handover_sessions` summary totals from accepted rows.
- Rejects frontend-only totals as source of truth.
- Requires all writes to be one atomic unit or not promoted.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No database schema was changed.
- No production migration was run.

### Verification

Command:

```bash
npm run check
```

Result:

```text
Syntax check passed for 33 file(s).
tests 58 / pass 58
Worker assets dry-run build passed
Worker embedded dry-run build passed
```

## Employee Rent Write Plan Helper Update

Date: 2026-05-23

### Files Added Or Updated

- Added `modules/employees/rent-write-plan.mjs`.
- Added `tests/employee-rent-write-plan.spec.mjs`.

### Why

The write contract now has a pure plan generator that converts a reviewed rent entry draft into ordered table operations. This is the last safe step before any local-only persistence rehearsal.

### Rules Captured

- Generates ordered operations for `transactions`, `receivables`, `payments`, conditional `arrear_tasks`, `audit_events`, and `handover_sessions` recompute.
- Keeps `company_id` and `property_id` on every inserted row.
- Converts BigInt money into SQL-safe integer values at the boundary.
- Requires audit event ids and rejects incomplete partial-payment plans.
- Does not execute SQL.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No database schema was changed.
- No production migration was run.

### Verification

Command:

```bash
npm run check
```

Result:

```text
Syntax check passed for 35 file(s).
tests 63 / pass 63
Worker assets dry-run build passed
Worker embedded dry-run build passed
```

## Rent Write Plan Local D1 Rehearsal Update

Date: 2026-05-23

### Files Added Or Updated

- Added `scripts/rehearse-rent-write-plan.mjs`.
- Added npm script `rehearsal:rent-write-plan`.
- Added static safety test to ensure the rehearsal is local-only and not part of default `npm run check`.

### Why

The rent write plan needed proof that planned commercial rows fit the draft D1 schema before any Worker route is changed.

### Rehearsal Behavior

- Creates a disposable local D1 directory.
- Applies `migration-drafts/002_commercial_bootstrap.sql`.
- Seeds company, property, staff user, membership, bed, rent config, and draft handover session.
- Builds a partial rent entry draft and write plan.
- Executes generated SQL locally.
- Verifies transaction, receivable, payment, arrear task, audit events, and handover recomputed totals.
- Deletes the temporary D1 directory.

### Verification

Commands:

```bash
npm run check
npm run rehearsal:rent-write-plan
```

Result:

```text
Syntax check passed for 36 file(s).
tests 64 / pass 64
Worker assets dry-run build passed
Worker embedded dry-run build passed
Rent write plan rehearsal passed.
Validated operations: 10
Mode: local-only disposable D1; no production mutation.
```

### Safety Scope

- No production D1 was touched.
- No Worker route was changed.
- No frontend was changed.
- The rehearsal command is not part of default `npm run check`.

## TTLock Remark Parser Helper Update

Date: 2026-05-23

### Files Added Or Updated

- Added `modules/properties/ttlock-remark.mjs`.
- Added `tests/ttlock-remark.spec.mjs`.
- Added module and test syntax checks to `npm run typecheck`.

### Why

Rent follow-up depends on TTLock remark anchors. The parser must preserve the full raw remark while extracting structured anchors without inventing missing data.

### Rules Captured

- First numeric token is the bed anchor.
- `Dxxx` is parsed as deposit AED and converted to integer fils.
- First valid 4-digit month/day token becomes `MM-DD`; no year is created.
- Remarks containing staff keywords `abdul` or `bilal` are excluded from rent follow-up.
- A standalone `e` token marks a vacant bed and is excluded from rent follow-up.
- Missing anchors return `null` instead of fabricated values.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No database schema was changed.
- Existing TTLock behavior is unchanged.

### Verification

Command:

```bash
npm run check
```

Result:

```text
tests 51 / pass 51
Worker assets dry-run build passed
Worker embedded dry-run build passed
```

## Finance Rent Period Helper Update

Date: 2026-05-23

### Files Added Or Updated

- Added `modules/finance/periods.mjs`.
- Added `tests/finance-periods.spec.mjs`.
- Added module and test syntax checks to `npm run typecheck`.

### Why

Rent entry needs deterministic period anchors so staff do not manually invent start/end dates. The helper separates display coverage dates from next due dates to avoid the recurring 15-day ambiguity.

### Rules Captured

- `1M`: keeps the same-day monthly anchor and uses system list rent.
- `15D`: fixed `400.00 AED`; display end is start + 14 days; next due date is start + 15 days.
- `CUST`: fixed `40.00 AED` per custom day; display end is start + days - 1; next due date is start + days.
- Invalid dates, invalid cycles, and non-positive custom days are rejected.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No database schema was changed.
- Existing runtime period calculation is unchanged.

### Verification

Command:

```bash
npm run check
```

Result:

```text
tests 46 / pass 46
Worker assets dry-run build passed
Worker embedded dry-run build passed
```

## Finance Receivables Settlement Helper Update

Date: 2026-05-23

### Files Added Or Updated

- Added `modules/finance/receivables.mjs`.
- Added `tests/finance-receivables.spec.mjs`.
- Added module and test syntax checks to `npm run typecheck`.

### Why

Short-paid rent must not stay as a free-text exception. If `paid < due`, the system needs a structured receivable outcome:

- exact payment closes the receivable,
- overpayment is recorded separately,
- short payment creates an arrears task draft,
- owner-approved discount/waiver creates an adjustment draft instead of arrears.

### Accounting Rules Captured

- Money inputs must be integer fils.
- Dates must be explicit `YYYY-MM-DD` strings.
- Arrears require both reason code and promise date.
- Approved adjustments require an explicit approved adjustment reason.
- The helper does not auto-create dates or silently waive balances.

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
tests 41 / pass 41
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

## Employee Entry Idempotency Helper Update

Date: 2026-05-23

### Files Added Or Updated

- Added `modules/employees/idempotency.mjs`.
- Added `tests/employee-idempotency.spec.mjs`.

### Why

Employee entry submission must be safe under weak networks, browser refreshes, and repeated clicks. A commercial write path needs a deterministic idempotency key scoped by company, property, session, operator, and client-generated entry id before any transaction rows are inserted.

### Rules Captured

- `companyId`, `propertyId`, `sessionId`, `operatorId`, and `clientEntryId` are all required.
- Values are trimmed before canonicalization.
- The returned key is a SHA-256 based scoped key prefixed with `emp_entry_`.
- Changing any isolation anchor changes the key.
- The helper stores no secrets and does not execute SQL.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No database schema was changed.
- No production data was read or mutated.
- Existing runtime financial behavior is unchanged.

### Verification

Commands:

```bash
npm run check
npm run rehearsal:rent-write-plan
```

Result:

```text
Syntax check passed for 38 file(s).
tests 67 / pass 67
Worker assets dry-run build passed
Worker embedded dry-run build passed
Rent write plan local D1 rehearsal passed
Validated operations: 10
Mode: local-only disposable D1; no production mutation.
```

## Transaction Idempotency Storage Contract Update

Date: 2026-05-23

### Files Added Or Updated

- Updated `COMMERCIAL_ENTRY_WRITE_CONTRACT.md`.
- Updated `migration-drafts/002_commercial_bootstrap.sql`.
- Updated `modules/employees/rent-write-plan.mjs`.
- Updated `scripts/rehearse-rent-write-plan.mjs`.
- Updated `tests/employee-rent-write-plan.spec.mjs`.
- Updated `tests/migration-draft.spec.mjs`.

### Why

Pure idempotency keys are not enough for commercial accounting writes. The database schema draft and write plan must carry the key so duplicate employee submissions are blocked by a database uniqueness constraint, not only by UI state or client behavior.

### Rules Captured

- `transactions.idempotency_key` is required in the commercial schema draft.
- The draft schema includes `idx_transactions_idempotency` on `transactions(company_id, property_id, idempotency_key)`.
- The rent write plan requires `options.idempotencyKey` and maps it to the transaction row.
- The local D1 rehearsal verifies the transaction row includes the expected key.
- The Worker conflict-return behavior remains documented, not implemented.

### Safety Scope

- No production migration was executed.
- No production database was read or mutated.
- No Worker route was changed.
- No frontend behavior was changed.
- Existing runtime financial behavior is unchanged.

### Verification

Commands:

```bash
npm run check
npm run rehearsal:rent-write-plan
```

Result:

```text
Syntax check passed for 38 file(s).
tests 68 / pass 68
Worker assets dry-run build passed
Worker embedded dry-run build passed
Rent write plan local D1 rehearsal passed
Validated operations: 10
Mode: local-only disposable D1; no production mutation.
```

## Duplicate Idempotency Rehearsal Update

Date: 2026-05-23

### Files Added Or Updated

- Updated `scripts/rehearse-rent-write-plan.mjs`.

### Why

The prior local D1 rehearsal proved a commercial rent write plan could be inserted once. It did not prove that a weak-network retry with a different transaction id but the same scoped idempotency key would be blocked by the database. Commercial accounting writes need this duplicate-write guard before Worker promotion.

### Rules Captured

- The rehearsal now inserts the rent write plan once.
- It then attempts a second write with different row ids and the same `idempotency_key`.
- The duplicate write must fail with a SQLite unique constraint error.
- After the blocked duplicate, transaction, receivable, and payment counts must remain at one.

### Safety Scope

- Local disposable D1 only.
- No production migration was executed.
- No production data was read or mutated.
- No Worker route was changed.
- No frontend behavior was changed.

### Verification

Commands:

```bash
npm run check
npm run rehearsal:rent-write-plan
```

Result:

```text
Syntax check passed for 38 file(s).
tests 68 / pass 68
Worker assets dry-run build passed
Worker embedded dry-run build passed
Rent write plan local D1 rehearsal passed
Duplicate idempotency write blocked: true
Mode: local-only disposable D1; no production mutation.
```

## Clean Worker Bootstrap Recheck

Date: 2026-05-23

### Command

```bash
npm run probe:clean-bootstrap
```

### Result

```text
Employee entry smoke exit code: 1
FAIL employee entry expected 200, got 500
Caused by: Error: no such table: transactions: SQLITE_ERROR
P0 confirmed: clean local Worker bootstrap cannot complete employee entry.
```

### Assessment

The local commercial schema rehearsal is healthy, but the live Worker employee-entry route still uses the legacy path and cannot bootstrap a clean D1. This is intentionally left unfixed until the Worker route is migrated safely with commercial write-path tests.

## Employee Entry Worker Migration Plan Update

Date: 2026-05-23

### Files Added Or Updated

- Added `EMPLOYEE_ENTRY_WORKER_MIGRATION_PLAN.md`.
- Updated `tests/migration-draft.spec.mjs`.

### Why

The live `/api/employee/entry` route is the current P0 boundary. Directly patching the monolith would risk expanding the legacy function and mixing commercial accounting with the old flow. The plan defines a staged adapter/executor/feature-flag approach before any Worker modification.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No database schema was changed.
- No production deployment or D1 mutation was executed.

### Verification

```text
npm run check passed
Syntax check passed for 38 file(s).
tests 69 / pass 69
Worker assets dry-run build passed
Worker embedded dry-run build passed
```

## Employee Entry Commercial Adapter Update

Date: 2026-05-23

### Files Added Or Updated

- Added `modules/worker/employee-entry-commercial-adapter.mjs`.
- Added `tests/employee-entry-commercial-adapter.spec.mjs`.
- Updated `EMPLOYEE_ENTRY_WORKER_MIGRATION_PLAN.md`.

### Why

The live Worker route should not be modified until the commercial conversion logic is isolated and tested outside the monolith. The adapter converts an existing employee rent payload plus authenticated/resolved server context into a rent draft, scoped idempotency key, and commercial write plan without touching D1.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No database schema was changed.
- No production data was read or mutated.
- Adapter contains no direct D1 access.

### Verification

```text
npm run check passed
npm run rehearsal:rent-write-plan passed
Syntax check passed for 40 file(s).
tests 73 / pass 73
Worker assets dry-run build passed
Worker embedded dry-run build passed
Duplicate idempotency write blocked: true
```

## D1 Write Plan Executor Update

Date: 2026-05-23

### Files Added Or Updated

- Added `modules/worker/d1-write-plan-executor.mjs`.
- Added `tests/d1-write-plan-executor.spec.mjs`.
- Updated `EMPLOYEE_ENTRY_WORKER_MIGRATION_PLAN.md`.

### Why

Before wiring the commercial adapter into the Worker, the D1 execution boundary needs a tested module. The executor converts write-plan operations into allowlisted, parameterized SQL statements, requires `db.batch`, and maps unique constraint failures to an idempotency-conflict result.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No production database was read or mutated.
- Tests use a fake D1 object.

### Verification

```text
npm run check passed
npm run rehearsal:rent-write-plan passed
Syntax check passed for 42 file(s).
tests 77 / pass 77
Worker assets dry-run build passed
Worker embedded dry-run build passed
Duplicate idempotency write blocked: true
```

## Employee Entry Commercial Handler Wrapper Update

Date: 2026-05-23

### Files Added Or Updated

- Added `modules/worker/employee-entry-commercial-handler.mjs`.
- Added `tests/employee-entry-commercial-handler.spec.mjs`.
- Updated `EMPLOYEE_ENTRY_WORKER_MIGRATION_PLAN.md`.

### Why

Before changing the live Worker route, route-level behavior must be tested outside the monolith. The wrapper enforces role and property membership checks, calls the commercial adapter/executor, maps idempotency conflicts to staff-safe responses, and avoids raw database error leakage.

### Safety Scope

- No Worker route was changed.
- No frontend was changed.
- No production database was read or mutated.
- Tests use injected executors and fake inputs.

### Verification

```text
npm run check passed
npm run rehearsal:rent-write-plan passed
Syntax check passed for 44 file(s).
tests 81 / pass 81
Worker assets dry-run build passed
Worker embedded dry-run build passed
Duplicate idempotency write blocked: true
```

## Worker Source Boundary Recheck

Date: 2026-05-23

### Finding

`deploy-worker/src/index.js` is a bundled monolith with no source-level import graph, while `deploy-worker/wrangler.toml` points directly to that file. Directly wiring `modules/worker/*` into it would require manual edits to a bundled runtime boundary.

### Decision

No Worker route integration was performed in this step.

### Risk Avoided

- Avoided expanding the bundled Worker monolith.
- Avoided manual copy/paste integration that would be hard to maintain.
- Avoided changing live `/api/employee/entry` behavior without a reviewed Worker build path.

### Required Next Step

Identify the canonical Worker source or add a reviewed Worker module build step before enabling `EMPLOYEE_ENTRY_COMMERCIAL_V1`.

## P0-007A Repeatable Local Worker Auth Smoke

Date: 2026-05-23

### Files Added Or Updated

- Added `scripts/local-worker-utils.mjs`.
- Added `scripts/dev-worker.mjs`.
- Added `scripts/wait-for-worker.mjs`.
- Added `scripts/smoke-with-worker.mjs`.
- Added `scripts/generate-dev-secrets.mjs`.
- Added `scripts/smoke-owner-auth.mjs`.
- Added `scripts/smoke-employee-auth.mjs`.
- Added `deploy-worker/.dev.vars.example`.
- Updated `.env.example`, `.env.local.example`, `.gitignore`, `package.json`.
- Updated `scripts/smoke-worker.mjs` and `scripts/smoke-auth.mjs`.
- Updated `deploy-worker/src/index.js` and regenerated `deploy-worker/src/index.embedded.js` so dev employee seed only runs when `APP_ENV` is local/dev/test and `ALLOW_DEV_SEED=true`.

### Why

`npm run smoke` and `npm run smoke:auth` previously failed if the local Worker was not already running on `127.0.0.1:8793`. This was a test orchestration failure. P0-007A requires a repeatable local Worker + Auth smoke command without production deploy, production D1 migration, or auth bypass.

### Safety Scope

- No production Worker deploy was executed.
- No production D1 migration was executed.
- No production config was modified.
- No financial formula was changed.
- No tenant architecture was changed.
- `deploy-worker/.dev.vars` remains ignored and was not committed.

### Verification

```text
npm run format:check passed
npm run lint passed
npm run typecheck passed
Syntax check passed for 51 file(s).
npm run build passed with wrangler dry-run only
npm run governance:check passed
npm run audit:api passed
API inventory written: 27 routes
npm run audit:db passed
Database static scan written: 40 findings, 20 tables
npm test passed
tests 81 / pass 81 / fail 0
npm run smoke:with-worker passed
```

### Auth Smoke Evidence

```text
PASS Worker ready at http://127.0.0.1:8793
PASS employee page 200 http://127.0.0.1:8793/employee-v3.html
PASS owner page 200 http://127.0.0.1:8793/index-51.html
PASS unauthenticated api 401 http://127.0.0.1:8793/api/me
PASS unauthenticated /api/me rejected 401
PASS invalid jwt rejected 401
PASS owner login 200
PASS owner /api/me 200
PASS owner role manager
PASS owner allowed /api/rent_config 200
PASS employee login 200
PASS employee /api/me 200
PASS employee role staff
PASS employee denied owner history 403
PASS employee allowed rent config 200
PASS smoke:auth
Local Worker stopped.
```

### Remaining Blocker Outside P0-007A

`npm run probe:clean-bootstrap` still fails because clean local D1 does not have a `transactions` table for employee entry:

```text
Caused by: Error: no such table: transactions: SQLITE_ERROR
P0 confirmed: clean local Worker bootstrap cannot complete employee entry.
```

This remains P0-005 and was not force-fixed in this task.

## P0-004 Delete Session Void / Soft-Delete

Date: 2026-05-23

### Files Added Or Updated

- Added `DELETE_SESSION_AUDIT.md`.
- Added `DELETE_SESSION_VOID_DESIGN.md`.
- Added `DELETE_SESSION_MIGRATION_PLAN.md`.
- Added `DELETE_SQL_SCAN.md`.
- Added `migration-drafts/003_delete_session_void_fields.sql`.
- Added `scripts/test-delete-session-void.mjs`.
- Updated `deploy-worker/src/index.js`.
- Regenerated `deploy-worker/src/index.embedded.js`.
- Updated `scripts/audit-api.mjs`, `API_INVENTORY.md`, and `DATABASE_STATIC_SCAN.md`.
- Updated `tests/source-risk.spec.mjs`, `COMMERCIALIZATION_BACKLOG.md`, and `P0_P1_STATUS_REVIEW.md`.
- Updated `package.json` with `test:delete-session`.

### Why

`/api/delete_session` previously physically deleted `deposit_ledger`, `transactions`, `arrears`, and `sessions`. That destroys financial evidence and is not acceptable for commercial accounting software. The route now voids rows and records audit evidence instead.

### Safety Scope

- No production Worker deploy was executed.
- No production D1 migration was executed.
- No production config was modified.
- No financial formula was changed.
- No multi-tenant architecture was changed.
- No secret was generated or committed.

### Verification

```text
npm run test:delete-session passed
npm run check passed
npm run smoke:with-worker passed
```

### Delete Session Void Evidence

```text
PASS unauthenticated delete rejected 401
PASS invalid jwt delete rejected 401
PASS employee delete forbidden 403
PASS owner void session 200
PASS owner second void idempotent 200
PASS voided session hidden from active history
PASS voided transaction hidden from active detail
PASS sessions_count 1
PASS transactions_count 1
PASS deposit_count 1
PASS arrears_count 1
PASS voided_sessions 1
PASS voided_transactions 1
PASS voided_deposits 1
PASS voided_arrears 1
PASS audit_logs_count 1
PASS entry_events_count 1
```

### Remaining Risks Outside P0-004

- P0-001 money precision remains open because legacy runtime still uses `REAL`/`Number`.
- P0-005 clean D1 bootstrap was outside P0-004 and is addressed in the P0-005 section below.
- P0-006 tenant isolation remains open and was not changed in this task.
- The migration draft must not be applied to production without manual review and rollback planning.

## P0-005 Clean Local D1 Bootstrap

Date: 2026-05-24

### Files Added Or Updated

- Added `migrations/local/001_clean_legacy_bootstrap.sql`.
- Added `scripts/db-local-bootstrap-utils.mjs`.
- Added `scripts/db-local-reset.mjs`.
- Added `scripts/db-local-migrate.mjs`.
- Added `scripts/db-local-seed.mjs`.
- Added `scripts/db-local-bootstrap.mjs`.
- Added `scripts/verify-clean-d1.mjs`.
- Added `D1_BOOTSTRAP_AUDIT.md`.
- Added `D1_MINIMUM_SCHEMA_PLAN.md`.
- Added `D1_MIGRATION_ORDER.md`.
- Added `D1_CLEAN_BOOTSTRAP_FIX_REPORT.md`.
- Added `CLEAN_D1_BOOTSTRAP_RESULT.md`.
- Added `RUNTIME_DDL_STATUS.md`.
- Updated `scripts/probe-clean-worker-bootstrap.mjs`.
- Updated `scripts/audit-db.mjs`.
- Updated `package.json` with local D1 scripts.

### Why

A clean local D1 could not run employee entry because `transactions` was never created by a migration. The previous `migrations/001_employee_anchor_schema.sql` only alters an existing `transactions` table, so it cannot bootstrap a new environment.

### Safety Scope

- No production Worker deploy was executed.
- No production D1 migration was executed.
- No remote D1 command was executed.
- No production config was modified.
- No financial formula was changed.
- No tenancy model was changed.

### Verification

```text
npm run db:local:bootstrap passed
npm run verify:clean-d1 passed
npm run probe:clean-bootstrap passed
```

### Clean D1 Evidence

```text
PASS local migration migrations\local\001_clean_legacy_bootstrap.sql
PASS local dev seed app_settings for local-dev-company
PASS Worker ready at http://127.0.0.1:8797
PASS smoke
PASS smoke:auth
PASS smoke:core
PASS smoke:employee-entry
PASS sessions_count 1
PASS transactions_count 1
PASS arrear_tasks_count 1
PASS audit_logs_count 1
PASS entry_events_count 1
PASS rent_settings_count 1
PASS clean D1 bootstrap verification
```

### Remaining Risks Outside P0-005

- P0-001 money precision remains open because local bootstrap intentionally preserves legacy `REAL` columns.
- P0-006 tenant isolation remains open.
- P0-008 formal receivables lifecycle remains open.
- Runtime DDL remains P1-002 and was not removed in this task.

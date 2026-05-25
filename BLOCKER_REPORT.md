# Blocker Report

Date: 2026-05-23  
Mode: NIGHT SHIFT  
Production deploy: not executed  
Production database mutation: not executed

## Blocking Risks

### P0: Local authentication setup was blocking authenticated flows

Evidence:

```text
POST /auth/employee-login -> 503
Error: jwt_secret_missing
```

Impact:

- Employee authenticated workflows cannot be verified locally.
- Permission checks beyond unauthenticated 401 cannot be fully validated.

Safe resolution:

- Add real local `.dev.vars` using non-production secrets.
- Add documented password-hash generation workflow.
- Do not hardcode passwords or secrets.

Current status:

- Basic authenticated smoke is now passing locally with ignored non-production `.dev.vars`.
- Owner login, employee login, `/api/me`, and employee denial from `/api/history` are verified.
- Full employee entry/export and owner dashboard flows are still not fully validated.

### P0: Clean database bootstrap is not proven

Evidence:

Local D1 schema currently shows only:

```text
active_sessions
employee_users
```

Impact:

- A new customer or clean environment may not have required business tables.
- Runtime schema mutation is not a commercial-grade migration strategy.

Safe resolution:

- Create explicit, ordered migrations for all business tables.
- Use integer minor-unit money columns in new migrations.
- Test clean database bootstrap locally before production rollout.

Confirmed follow-up:

- `npm run smoke:employee-entry` failed with HTTP 500.
- Local D1 table scan confirmed `transactions` is missing.
- The endpoint cannot create a first employee entry on a clean local D1.
- This should not be patched with ad hoc local SQL; it requires a proper migration.

Reconfirmed by disposable clean Worker probe:

```text
npm run probe:clean-bootstrap
Employee entry smoke exit code: 1
Caused by: Error: no such table: transactions: SQLITE_ERROR
P0 confirmed: clean local Worker bootstrap cannot complete employee entry.
```

## Recheck: Clean Worker Bootstrap Still Blocked

Date: 2026-05-23

Command:

```bash
npm run probe:clean-bootstrap
```

Result:

```text
Employee entry smoke exit code: 1
FAIL employee entry expected 200, got 500
Caused by: Error: no such table: transactions: SQLITE_ERROR
P0 confirmed: clean local Worker bootstrap cannot complete employee entry.
```

Assessment:

- The commercial schema draft and local rent write rehearsal now pass.
- The live Worker route still has not been migrated to that commercial path.
- This remains a P0 blocker for any new customer environment.

Do not close this blocker until:

```bash
npm run probe:clean-bootstrap
```

passes against a clean disposable local D1 without ad hoc SQL patches.

## Worker Source Boundary Blocks Direct Module Integration

Date: 2026-05-23

Finding:

- `deploy-worker/src/index.js` is a bundled monolith.
- It starts with bundled helper declarations and has no source-level `import` graph.
- `wrangler.toml` points directly to `src/index.js`.
- Directly importing `modules/worker/*` from this file would be a high-risk manual edit to the bundled runtime boundary.

Commercial impact:

- The commercial adapter, handler, and D1 executor now exist and are tested.
- They cannot be safely wired into production until the Worker source/build boundary is clarified.
- Patching the generated/bundled file directly would increase maintenance risk and could hide future regressions.

Safe resolution:

- Identify the canonical Worker source before bundling, or create an explicit Worker source module tree.
- Add a build step that bundles `modules/worker/*` into the Worker.
- Only then add the default-off `EMPLOYEE_ENTRY_COMMERCIAL_V1` route integration.

Current action:

- No Worker route modification was made.

Validation rule:

- This blocker is not closed until `npm run probe:clean-bootstrap` passes against a disposable local D1 state.

Mitigation progress:

- `modules/employees/entry-draft.mjs` defines a tested rent-entry draft contract.
- `modules/employees/rent-write-plan.mjs` maps that draft to commercial table operations.
- `COMMERCIAL_ENTRY_WRITE_CONTRACT.md` defines the required server-side write sequence.
- `npm run rehearsal:rent-write-plan` now proves the planned rent rows fit `migration-drafts/002_commercial_bootstrap.sql` on disposable local D1.

Current status:

- Still open.
- The rehearsal validates the future commercial write plan only.
- The live `/api/employee/entry` route still uses the legacy Worker path and `npm run probe:clean-bootstrap` remains the closure gate.

### P0: Existing money model still uses decimal/REAL in business tables

Evidence:

- Existing schema and Worker code use `REAL` and `Number` for financial values.

Impact:

- Float precision can corrupt rent, deposit, arrears, refunds, and handover totals.

Safe resolution:

- Introduce integer minor-unit helpers and schema fields.
- Migrate gradually with compatibility reads.
- Do not alter financial calculation behavior without tests and reconciliation.

### P0: Financial hard-delete path exists

Evidence:

- Existing session delete path deletes transaction/deposit/arrears rows.

Impact:

- Commercial audit trail can be lost.
- Owner/staff disputes cannot be reconstructed.

Safe resolution:

- Replace normal delete with void/soft-delete.
- Preserve before/after audit events.
- Keep physical deletion only for explicit local test cleanup tooling.

### P1: Owner-side legacy script has duplicate function declarations

Evidence:

```text
index-51-main.js
Parsing error: Identifier 'rc_renderCfg' has already been declared
```

Impact:

- Lint cannot pass.
- Duplicate implementation risk makes future fixes unsafe.

Safe resolution:

- Review duplicate blocks.
- Remove or rename only the obsolete duplicate after confirming behavior.
- Add regression check for rent config UI.

## Stop Condition

No further business logic modifications should proceed until:

- local secrets are configured safely,
- clean D1 bootstrap is defined,
- financial delete policy is converted to void/soft-delete,
- lint blockers are triaged into isolated fixes.

## NIGHT SHIFT V2 Blockers

### P0: Financial precision model is not commercial-grade

Evidence:

- `DATABASE_AUDIT.md` and `FINANCE_AUDIT.md` identify `REAL` and JS `Number` use across financial data.

Impact:

- Rent, deposit, arrears, refund, expense, and handover totals can suffer precision drift.

Safe resolution:

- Add integer minor-unit fields in new migrations.
- Add compatibility reads and reconciliation tests.
- Do not change existing formulas without finance regression tests.

### P0: Employee handover is not server-atomic

Evidence:

- Employee session export/submission logic sends accepted entries individually to `/api/employee/entry`.

Impact:

- A weak network or repeated click can leave a partially uploaded handover.

Safe resolution:

- Add a backend handover commit endpoint with idempotency key.
- Recompute totals server-side.
- Add duplicate-submit and network-failure tests.

### P0: Hard delete remains present in financial session path

Evidence:

- `/api/delete_session` deletes financial rows rather than voiding them.

Impact:

- Commercial audit trail and dispute evidence can be lost.

Safe resolution:

- Replace standard delete with void/soft-delete and immutable audit events.

### P1: Embedded Worker source can drift

Evidence:

- `deploy-worker/src/index.embedded.js` is generated and was not regenerated during V2 because the night rules prohibit expanding giant files.

Impact:

- Embedded deployment path may not include source Worker lint cleanup until a controlled build-prep step regenerates it.

Safe resolution:

- Add a generated-file hash check.
- Regenerate embedded Worker only during explicit deploy preparation.

### P1: Embedded Worker missing P0-002C staging handover route

Date: 2026-05-24

Evidence:

```text
deploy-worker/wrangler.toml -> main = "src/index.js"
deploy-worker/wrangler.embedded.toml -> main = "src/index.embedded.js"
rg "/api/staging/handover/commit|ENABLE_HANDOVER_ATOMIC_STAGING|handover_commits" deploy-worker/src/index.js deploy-worker/src/index.embedded.js
```

Result:

- `deploy-worker/src/index.js` contains the P0-002C staging handover route.
- `deploy-worker/src/index.embedded.js` does not contain the P0-002C staging handover route.

Impact:

- Local/main Worker validation is not blocked because it uses `wrangler.toml`.
- Any staging deploy using `wrangler.embedded.toml` would not expose the staging endpoint until a controlled embedded regeneration step is approved.

Safe resolution:

- Do not deploy the embedded Worker path for P0-002C validation yet.
- Create a P1-006 controlled embedded Worker regeneration/diff task.
- Add an embedded source drift gate before production deploy.

## P1-006 update: drift gate exists; controlled write still needs approval

Status: Partial, not resolved.

Evidence:

- `npm run audit:worker-drift` generated `WORKER_ENTRYPOINT_DRIFT_AUDIT.md`.
- `npm run verify:embedded-worker` generated `EMBEDDED_WORKER_FRESHNESS_RESULT.md` with `MANUAL_REQUIRED`.
- `npm run build:embedded:dry-run` generated `.tmp/embedded-worker-dry-run/index.embedded.generated.js` without overwriting `deploy-worker/src/index.embedded.js`.

Current blocker:

- Current `deploy-worker/src/index.embedded.js` still lacks `/api/staging/handover/commit` and staging feature/table references.
- Embedded staging/prod deploy remains blocked until human approval of controlled write.

Safe path:

- Continue local/source Worker validation through `deploy-worker/wrangler.toml`.
- Do not deploy through `wrangler.embedded.toml` until P1-006B controlled write is approved and verified.

## P1-006B update: controlled write completed; deploy still needs approval

Status: Artifact freshness resolved, deployment still blocked.

Evidence:

- `npm run build:embedded:write` generated `EMBEDDED_WORKER_CONTROLLED_WRITE_RESULT.md` and refreshed `deploy-worker/src/index.embedded.js`.
- `npm run audit:worker-drift` reports 0 critical mismatches and 0 route mismatches.
- `npm run verify:embedded-worker` reports `PASS`.
- `npm run build:embedded:dry-run` reports `PASS`.
- `npm run smoke:embedded-with-worker` reports `PASS`.

Remaining blocker:

- This task did not execute staging or production deployment.
- Actual Cloudflare staging/prod Worker, D1, KV, secrets, and deploy command are still not approved.

Safe path:

- P0-001E local/staging rehearsal may continue without deployment.
- Any real deploy still needs a separate deploy approval task.

## Night Shift V4 deep loop: rollback readiness gaps

Status: MANUAL_REQUIRED / BLOCKED for specific rollback evidence only.

Evidence:

- `npm run audit:rollback-readiness` generated `ROLLBACK_READINESS_MATRIX.md`
  and `ROLLBACK_READINESS_AUDIT_RESULT.md`.
- Result: `ROLLBACK_READINESS_AUDIT=MANUAL_REQUIRED`.
- Ready draft areas: 8.
- Manual-required areas: 1.
- Blocked areas: 1.

Current blockers:

- `MONEY_DUAL_WRITE_READINESS_GATE.md` is referenced as expected rollback
  evidence but is not present in the current repository state.
- Receivables implementation documents do not yet contain explicit rollback
  wording in the scanned evidence set.

Impact:

- Production money migration/backfill remains NO-GO.
- Production receivables implementation remains NO-GO.

Safe path:

- Continue local/staging dry-run planning.
- Do not execute production migration or remote D1 migration.
- Add or reconcile the missing money readiness gate document only after human
  review of the intended source of truth.

## STAGING-QA-005 blocker: real staging write QA requires staging flag enablement

Date: 2026-05-25, Asia/Dubai

Status: BLOCKED_BEFORE_WRITE.

Evidence:

- `npm run qa:employee-entry-staging -- --confirm-staging-write --confirm-backup --confirm-rollback` returned `MANUAL_REQUIRED` and `write execution: NOT_EXECUTED`.
- `POST https://homelink-finance-staging.habibramadan888.workers.dev/api/staging/handover/commit` returned `403 FEATURE_DISABLED`.
- `POST https://homelink-finance-staging.habibramadan888.workers.dev/api/staging/employee-entry/adapter-draft` returned `403 FEATURE_DISABLED`.
- `deploy-worker/wrangler.toml` currently sets staging vars `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=false` and `ENABLE_HANDOVER_ATOMIC_STAGING=false`.

Impact:

- Real staging write QA cannot validate employee entry adapter flag-on behavior.
- Real staging write QA cannot validate the handover staging endpoint.
- No staging business data was written during this blocked run.

Safe resolution:

- Run a separate human-approved staging-only task to enable both staging flags, execute write QA, and roll both flags back to `false`.
- Do not perform production deploy, production migration, production feature flag changes, or production cutover.

## STAGING-QA-005B blocker: baseline `npm run check` failed before flag enablement

Date: 2026-05-25, Asia/Dubai

Status: BLOCKED_BEFORE_FLAG_ENABLEMENT.

Evidence:

- Branch: `qa/staging-qa-005b-enable-flags-write-qa-rollback`
- `npm run security:secrets` passed.
- `npm run gate:commercial-launch` returned `PRODUCTION_NO_GO`.
- `npm run audit:worker-drift` passed with 0 critical mismatches.
- `npm run verify:embedded-worker` passed.
- `npm run build:embedded:dry-run` returned `WARNING` with 0 critical missing items.
- `npm run check` failed in `tests/employee-entry-adapter-staging-endpoint.spec.mjs`.

Failure:

```text
missing APP_ENV or disabled flag rejects employee entry adapter staging endpoint before auth
Error: Worker did not become ready on http://127.0.0.1:2621. Last error: fetch failed.
```

Impact:

- Staging feature flags were not enabled.
- Real staging write QA was not executed.
- No staging business data was written.
- Production remained untouched.

Safe resolution:

- Fix or stabilize the local Worker readiness timeout.
- Rerun the full STAGING-QA-005B baseline.
- Only after a passing baseline, enable staging-only flags and execute real staging write QA.

Resolution update:

- TEST-STABILITY-001 hardened the Worker readiness helper and affected test diagnostics.
- The targeted test passed three consecutive runs.
- `npm run check` passed with 182 tests.
- This blocker is resolved for retrying STAGING-QA-005B, but staging flags were not enabled during the fix.

## P0-003E Baseline Blocker: Formatting Drift In Generated Reports

Date: 2026-05-25, Asia/Dubai

Status: BLOCKED_BEFORE_BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL.

Evidence:

- Branch: `qa/p0-003e-backend-totals-staging-switch-rehearsal`
- Base commit: `d31a91de3aa1631ef0fee84893056360d8903d5b`
- Command: `npm run check`
- Failure stage: `npm run format:check`

Failure:

```text
[warn] BACKEND_TOTALS_AUTHORITY_REHEARSAL_RESULT.md
[warn] EMPLOYEE_ENTRY_REAL_STAGING_QA_DRY_RUN_RESULT.md
Code style issues found in 2 files. Run Prettier with --write to fix.
```

Impact:

- P0-003E baseline failed before any implementation work.
- `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING` was not enabled.
- No backend totals staging switch rehearsal was executed.
- No staging D1 write occurred.
- Production remained untouched.

Safe resolution:

- Run a dedicated formatting/rebaseline task for the two generated reports.
- Rerun the full P0-003E baseline.
- Do not proceed to backend totals switch rehearsal until `npm run check` passes.

Resolution update:

- FORMAT-REBASELINE-001 ran Prettier on
  `BACKEND_TOTALS_AUTHORITY_REHEARSAL_RESULT.md` and
  `EMPLOYEE_ENTRY_REAL_STAGING_QA_DRY_RUN_RESULT.md`.
- `npm run format:check` passed.
- `npm run check` passed with 193 tests.
- `npm run security:secrets` passed.
- `npm run gate:commercial-launch` returned `PRODUCTION_NO_GO`.
- No business code, tests, dashboard logic, financial formula, deployment,
  migration, staging write, or feature flag was changed.
- P0-003E is unblocked for retry, but the backend totals staging switch
  rehearsal has not been executed.

## P0-008D Baseline Blocker: Local Worker ECONNRESET In Existing Employee Tests

Date: 2026-05-25, Asia/Dubai

Status: BLOCKED_BEFORE_RECEIVABLES_STAGING_SHADOW_GATE.

Evidence:

- Branch: `qa/p0-008d-receivables-staging-shadow-gate`
- Base commit: `c49900df30f833262a8dab1b404fbe79163192ec`
- Command: `npm run check`
- Failure stage: Node test runner during existing employee entry Worker tests.
- `npm run format:check` passed before the failure.
- `npm run security:secrets` passed inside `npm run check` before the failure.
- `audit:api:check` and `audit:db:check` passed before the failure.

Failing tests:

```text
tests/employee-entry-adapter-staging-endpoint.spec.mjs
- enabled employee entry adapter endpoint enforces auth, role, validation, and no live writes
- TypeError: fetch failed
- cause: Error: read ECONNRESET

tests/employee-entry-route-switch-rehearsal.spec.mjs
- local flag on rejects owner submitter before adapter rehearsal write
- TypeError: fetch failed
- cause: Error: read ECONNRESET

tests/employee-entry-route-switch-rehearsal.spec.mjs
- local flag on rejects invalid money before legacy write
- TypeError: fetch failed
- cause: Error: read ECONNRESET
```

Impact:

- P0-008D implementation was not started.
- `ENABLE_RECEIVABLES_SHADOW_STAGING` was not added or enabled.
- No staging D1 read/write was executed for receivables shadow comparison.
- No production deploy, production migration, production D1 write, production URL
  call, staging D1 write, dashboard mutation, or feature flag change occurred.

Safe resolution:

- Rebaseline or stabilize the existing local Worker test ECONNRESET before
  retrying P0-008D.
- Rerun the full P0-008D baseline after the Worker tests are stable.
- Do not proceed to receivables staging shadow implementation until
  `npm run check` passes.

Resolution update:

- TEST-STABILITY-002 added local Worker `fetchWithRetry()` diagnostics for
  transient socket failures without retrying HTTP business responses.
- Employee-entry Worker tests now capture stdout/stderr and clean local Worker
  child processes at test-level where applicable.
- `npm run reproduce:employee-entry-econnreset` passed 3 consecutive runs.
- `npm run test:employee-entry-production-lock` passed 3 total runs.
- `npm run test:employee-entry-route-switch` passed 3 total runs.
- `npm run test:employee-entry-adapter-staging-endpoint` passed 3 total runs.
- `npm run check` passed with 224 tests.
- `npm run security:secrets` passed.
- `npm run gate:commercial-launch` returned `PRODUCTION_NO_GO`.
- `npm run qa:employee-entry-staging` remained `MANUAL_REQUIRED` /
  `DRY_RUN_ONLY`.
- No production deploy, staging deploy, migration, D1 write, staging write,
  feature flag enablement, dashboard change, financial formula change, test
  skip, or secret commit occurred.
- P0-008D is unblocked for retry, but receivables staging shadow gate
  implementation has not been executed in this task.

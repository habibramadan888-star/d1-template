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

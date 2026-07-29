# Next Action Plan

Generated: 2026-05-23, Asia/Dubai

## Next 72 Hours Plan

## Route A: Safest Route

Only verification, documentation, tests, and local-only scripts. No live business-core change.

### Step 1

- Task: Create a Worker source/build boundary report and verify which file is canonical.
- Why first: Current blockers say direct patching of `src/index.js` / `src/index.embedded.js` risks drift and regression.
- Files affected: report only, likely `WORKER_SOURCE_BOUNDARY_PLAN.md`.
- Risk: Low.
- Verification: `npm run build`, `npm run audit:api`, compare route inventory before/after.
- Can Codex do alone: yes.
- Needs human approval: no, if report-only.

### Step 2

- Task: Define local smoke preflight requirements without hardcoded secrets.
- Why first: Current `smoke` and `smoke:auth` fail because local Worker is not running.
- Files affected: docs/report only, optionally a dev-only preflight script later.
- Risk: Low.
- Verification: command availability and documented expected env vars.
- Can Codex do alone: yes.
- Needs human approval: no, unless creating local secrets.

### Step 3

- Task: Re-run verification with explicit local Worker precondition and record exact commands.
- Why first: The project needs repeatable evidence before business changes.
- Files affected: `RUN_REPORT.md`, status reports.
- Risk: Low.
- Verification: `npm run smoke`, `npm run smoke:auth`, `npm run check`.
- Can Codex do alone: yes if local env is available.
- Needs human approval: no for local-only.

## Route B: Balanced Route

Fix the repeatability blocker first, then prepare the highest-risk data fixes without applying production migrations.

### Step 1

- Task: Fix P0-007 by making smoke tests fail fast with clear preflight or safely start a local Worker in dev-only mode.
- Why first: Without repeatable smoke, no frontend/API result is reliable.
- Files affected: `scripts/smoke-worker.mjs`, `scripts/smoke-auth.mjs`, package scripts, docs.
- Risk: Medium.
- Verification: `npm run smoke`, `npm run smoke:auth`, `npm run check`.
- Can Codex do alone: yes.
- Needs human approval: no, if no real secrets and no production deploy.

### Step 2

- Task: Prepare P0-004 hard-delete replacement plan with soft-delete/audit tests only.
- Why first: Hard delete is a commercial accounting blocker.
- Files affected: new test/spec/draft migration only.
- Risk: Medium.
- Verification: DB static scan must still detect old risk until live path is intentionally migrated.
- Can Codex do alone: yes for draft/tests.
- Needs human approval: yes before production migration or live route change.

### Step 3

- Task: Prepare P0-005 clean bootstrap non-production rehearsal for commercial schema.
- Why first: A new customer environment currently cannot be initialized from zero.
- Files affected: migration draft and local-only rehearsal scripts.
- Risk: Medium.
- Verification: disposable local D1 only, no production DB.
- Can Codex do alone: yes for local rehearsal.
- Needs human approval: yes before production D1 migration.

## Route C: Aggressive Route

Start live financial/tenant refactor. This is high risk and should not be autonomous.

### Step 1

- Task: Refactor Worker to a canonical modular source and regenerate embedded output.
- Why first: Live commercial path cannot be safely wired while monolith/embedded drift exists.
- Files affected: `deploy-worker/src/index.js`, `deploy-worker/src/index.embedded.js`, Worker modules.
- Risk: High.
- Verification: full smoke, auth, API inventory, DB audit, owner/employee browser E2E.
- Can Codex do alone: no.
- Needs human approval: yes.

### Step 2

- Task: Apply commercial schema migration and move money to integer fils.
- Why first: Finance precision is P0.
- Files affected: migrations, DB access layer, finance routes, reports.
- Risk: High.
- Verification: migration rehearsal, rollback plan, accountant-approved test cases.
- Can Codex do alone: no.
- Needs human approval: yes.

### Step 3

- Task: Add full tenant/company/property isolation to every API and table.
- Why first: SaaS requires data separation.
- Files affected: auth, DB schema, every data query, frontend context.
- Risk: High.
- Verification: cross-tenant negative tests and production-like staging.
- Can Codex do alone: no.
- Needs human approval: yes.

## Recommendation

Recommended route: Route A first.

Reason: current evidence shows a Worker source boundary blocker and repeatability gap. Fixing business logic before build/source ownership and local smoke preconditions are clear would increase regression risk. Route A creates reliable evidence without touching production, finance formulas, or live data.

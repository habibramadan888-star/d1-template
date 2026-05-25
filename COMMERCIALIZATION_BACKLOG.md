# Commercialization Backlog

Date: 2026-05-23  
Mode: NIGHT SHIFT V2  
Production deploy: not executed  
Production database mutation: not executed

## Executive Status

The project is not yet ready for commercial SaaS launch. Static checks, local Worker startup, and unauthenticated smoke checks now pass, but commercial blockers remain in finance precision, tenant isolation, migration discipline, and audited financial mutation flows.

## P0: Cannot Launch

| ID     | Area         | Problem                                                                                                                        | Impact                                                                                                                  | Required Fix                                                                                                                        | Verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0-001 | Finance      | Money uses `REAL`, decimal JS `Number`, and frontend decimal calculations.                                                     | Rent, deposit, arrears, refunds, and handover totals can drift.                                                         | Move new financial writes to integer minor units or decimal-safe helpers with reconciliation.                                       | P0-001A added money inventory, flow map, precision policy, helper guardrails, `npm run test:money`, and `npm run audit:money`; P0-001B added read-only local D1 shadow reconciliation via `npm run test:money-shadow` and `npm run reconcile:money`; live migration remains future work.                                                                                                                                                                                                                                                                                       |
| P0-002 | Finance      | Employee handover is uploaded entry by entry, not as a backend atomic session commit.                                          | Partial success can create incomplete handovers.                                                                        | Add backend session commit endpoint with idempotency key and transaction-like acceptance.                                           | P0-002A added handover flow audit, atomic commit design, test plan, and `npm run test:handover-atomic-design`. P0-002B added a non-invasive atomic commit rehearsal module, fixtures, `npm run test:handover-atomic`, `npm run rehearse:handover-atomic`, API/migration/go-live docs, and a disposable local D1 rehearsal. P0-002C implemented a local/staging-only endpoint with production disabled. P0-002D added manual QA package, hardening review, dashboard unchanged verification, and legacy-table unchanged verification. Live employee handover remains unchanged. |
| P0-003 | Finance      | Backend accepts frontend-provided session totals.                                                                              | Staff browser can become accounting authority.                                                                          | Backend recomputes cash handover, bank transfer, gross received, session totals, and dashboard rehearsal totals from accepted rows. | P0-003A added authority audit and shadow checks. P0-003B added `modules/finance/backend-totals.mjs`, fixtures, `npm run test:backend-totals`, `npm run rehearse:backend-totals`, source-of-truth/gate docs, and a local D1 discrepancy report. Live response remains unchanged.                                                                                                                                                                                                                                                                                                |
| P0-004 | Data         | `/api/delete_session` previously hard-deleted financial records. Normal path now voids records.                                | Original data-loss risk is locally mitigated; production migration discipline still required.                           | Keep void/soft-delete behavior covered by regression tests and review the production migration before rollout.                      | `npm run test:delete-session`, `npm run check`, and `npm run smoke:with-worker` pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| P0-005 | Database     | Clean local D1 bootstrap previously failed because `transactions` was missing; Windows cleanup was later flaky due to `EBUSY`. | New local/test customer environment could not verify first employee entry or reliably repeat clean bootstrap preflight. | Keep local reset/migrate/seed/verify workflow stable; production migration still needs human review.                                | `npm run verify:clean-d1` passes three consecutive Windows runs; `npm run probe:clean-bootstrap`, `npm run check` pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| P0-006 | Auth/Tenancy | `employee_users` is not tenant-scoped and `CORPID` is static.                                                                  | Future multi-customer SaaS can leak or collide staff identities.                                                        | Add company/tenant/property model and user membership scope.                                                                        | P0-006A added `TENANCY_SCOPE_AUDIT.md`, `TENANCY_MIGRATION_PLAN.md`, and `TENANCY_TEST_PLAN.md`; no live scope/query rewrite was done.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| P0-007 | Auth         | Local Worker + owner/employee auth smoke was not repeatable from one command.                                                  | Login and permission regressions could not be verified reliably.                                                        | Add dev-only Worker orchestration, dev secret preflight, and auth smoke boundary checks.                                            | `npm run smoke:with-worker` passes locally.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| P0-008 | Accounting   | No formal live `receivables` table exists.                                                                                     | Arrears are not a first-class accounting lifecycle.                                                                     | Introduce receivables before payments/arrear tasks.                                                                                 | P0-008A added `RECEIVABLES_MODEL_DESIGN.md`, `RECEIVABLES_LIFECYCLE_TEST_PLAN.md`, and `migration-drafts/004_receivables_model_draft.sql`; not wired or migrated.                                                                                                                                                                                                                                                                                                                                                                                                              |

### P0 Mitigation Progress

- P0-001: Partial. P0-001A now documents the money field inventory, finance flow map, AED fils policy, helper design, and migration plan. `npm run test:money` passes and `npm run audit:money` currently reports 215 REAL/FLOAT risks, 481 JS Number/parseFloat risks, 435 frontend money calculation risks, and 161 backend money calculation risks after adding P1-006 audit scripts. P0-001B added read-only local D1 shadow reconciliation; `npm run reconcile:money` scans local legacy money columns without writing data. P0-001C added draft dual-write preparation, but legacy runtime still uses `REAL`/`Number`, so P0-001 is not Verified.
- P0-002/P0-003: rent write plan and local D1 rehearsal now prove backend-owned handover recomputation and transaction idempotency storage are viable, but the live employee flow is still not switched. P0-002A added flow audit, future atomic design, idempotency contract tests, and a manual test plan. P0-002B added a non-invasive handover atomic module, 18 scenario fixtures, 24 rehearsal tests, a disposable local D1 rehearsal, source-of-truth/API/migration/go-live docs, and evidence for idempotent retry, duplicate warnings, frontend total tamper detection, voided-row rejection, unauthorized submitter rejection, and audit event planning. P0-002C-GATE added a human review packet and decision checklist. P0-002C implemented `POST /api/staging/handover/commit` as a local/staging-only feature-flagged endpoint with production 404, owner/admin 403, employee submit success, idempotency replay, duplicate-risk rejection, frontend-totals mismatch rejection, voided-row rejection, staging-table writes, audit/entry evidence, and no legacy `transactions`/`deposit_ledger`/`arrears` writes. P0-002D added manual QA guide, redacted PowerShell command generation, hardening audit, dashboard/history unchanged evidence, legacy-table unchanged evidence, and embedded Worker drift review. P0-003B added backend totals source-of-truth rules, non-invasive totals helper, 12 scenario fixtures, 16 authority tests, and a disposable local D1 rehearsal that produces MATCH/MISMATCH/LEGACY_WARNING discrepancy evidence.
- P0-004: `/api/delete_session` now voids `sessions`, `transactions`, `deposit_ledger`, legacy `arrears`, and linked `arrear_tasks` instead of hard deleting them. Verification passed with unauthenticated denial, invalid JWT denial, employee 403, owner void success, idempotent second void, hidden active rows, visible audit rows, retained original rows, `audit_logs`, and `entry_events`.
- P0-005: clean local D1 bootstrap now creates the minimum legacy-compatible tables, including `transactions`; `npm run verify:clean-d1` passes smoke, auth, owner core reads, and employee entry from an empty disposable D1. P0-005A fixed Windows cleanup stability by awaiting Worker shutdown and retrying local D1 cleanup; three consecutive `verify:clean-d1` runs passed without `EBUSY`.
- P0-008: commercial schema draft includes `receivables`, `payments`, and formal arrear lifecycle tables; P0-008A additionally designed receivable events, payment allocations, adjustments, and lifecycle tests. This remains future accounting work and was not implemented or migrated.
- P0-007: local Worker startup and auth smoke are now repeatable via `npm run smoke:with-worker`. Verified checks include unauthenticated denial, invalid JWT denial, owner login, employee login, employee denial from owner history, and employee allowed rent config. This does not close employee entry/export or owner dashboard business-flow coverage.

Current closure rule:

- These P0 items remain open until the Worker route, clean local bootstrap, authenticated smoke, and production migration plan all pass without bypassing auth or financial controls.

## P0-001C Minor-Unit Dual-Write Preparation Addendum

Date: 2026-05-24, Asia/Dubai

P0-001 remains `Partial - minor-unit dual-write preparation ready`.

Completed safely:

- Added `modules/finance/money-dual-write.mjs` to generate draft `*_fils` patches without database writes.
- Added `tests/money-dual-write.spec.mjs` and `npm run test:money-dual-write`.
- Added `scripts/rehearse-money-dual-write.mjs` and `npm run rehearse:money-dual-write`.
- Added draft-only migration `migration-drafts/005_money_minor_units_dual_write_draft.sql`.
- Added `MONEY_DUAL_WRITE_PREPARATION_PLAN.md` and `MONEY_DUAL_WRITE_GO_LIVE_GATE.md`.

Not completed:

- No production schema migration.
- No remote D1 migration.
- No live write-path switch.
- No dashboard/history reader switch.
- No automatic legacy/fils correction.

Verification:

- `npm run test:money-dual-write` passed.
- `npm run rehearse:money-dual-write` passed and generated `MONEY_DUAL_WRITE_REHEARSAL_RESULT.md`.
- The rehearsal intentionally reports one invalid `100.999` scenario as failed because AED authority must reject three-decimal input.

## P1: Must Fix Before Commercial Release

| ID     | Area           | Problem                                                                              | Impact                                                 | Required Fix                                                                                                            | Verification                                                                                                                                                                                                                                                                                            |
| ------ | -------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-001 | Audit          | Audit logs and entry events are split and not complete for every financial mutation. | Accountability gaps.                                   | Unified immutable `audit_events` model.                                                                                 | Before/after audit tests.                                                                                                                                                                                                                                                                               |
| P1-002 | Data           | Runtime `CREATE TABLE` / `ALTER TABLE` exists in request paths.                      | Production traffic can mutate schema unexpectedly.     | Move schema changes to migrations only.                                                                                 | P1-002A added `RUNTIME_DDL_MIGRATION_PLAN.md`, `RUNTIME_DDL_STATIC_SCAN.md`, and `npm run audit:runtime-ddl`; runtime DDL was not removed.                                                                                                                                                              |
| P1-003 | Finance        | Rent configuration is stored as JSON without effective dates.                        | Historical receivables can change if config changes.   | Version rent config with `effective_from` / `effective_to`.                                                             | Old sessions still use old rent.                                                                                                                                                                                                                                                                        |
| P1-004 | Timezone       | Date logic mixes browser local time, UTC ISO, and partial Dubai helpers.             | Overdue and due-soon statuses can be wrong.            | Centralize Dubai business-date helpers on server.                                                                       | P1-004A added `DUBAI_TIMEZONE_AUDIT.md`, `DUBAI_BUSINESS_DATE_POLICY.md`, `modules/finance/dubai-business-date.mjs`, and `npm run test:timezone`; live date formulas were not changed.                                                                                                                  |
| P1-005 | Security       | Default employee seed behavior is present.                                           | Production default credentials risk.                   | Restrict seeding to local/dev setup only and document it.                                                               | Production config cannot create default users.                                                                                                                                                                                                                                                          |
| P1-006 | Worker         | `src/index.embedded.js` is generated relative to source and can drift.               | Embedded deploy path can diverge from source behavior. | Regenerate only in a controlled deploy-prep step with dry-run, backup, freshness check, runtime probe, and secret scan. | P1-006 added route/guard drift audit, freshness hash gate, dry-run embedded generation, controlled write script, embedded runtime probe, and deploy-artifact GO/NO-GO docs. P1-006B refreshed `src/index.embedded.js` and verified 0 critical mismatches. Production/staging deploy remains unapproved. |
| P1-007 | API            | Hosted CI check workflow exists, but repository branch protection is not confirmed.  | Checks can still be bypassed without branch rules.     | Require `Commercial Check` before merge/deploy in repository rules.                                                     | Protected branch blocks route metadata drift.                                                                                                                                                                                                                                                           |
| P1-008 | UX Reliability | Employee export/preview and owner dashboard need authenticated regression checks.    | Commercial users may hit button failures after auth.   | Add Browser/E2E smoke after local secrets exist.                                                                        | Authenticated smoke scripts pass.                                                                                                                                                                                                                                                                       |
| P1-009 | Observability  | No production error monitoring plan.                                                 | Silent failures in customer use.                       | Add structured logs and Cloudflare alerts/Sentry-equivalent plan.                                                       | Synthetic error captured in staging.                                                                                                                                                                                                                                                                    |
| P1-010 | Environments   | Staging and production separation is not documented enough for commercial rollout.   | Test changes may affect production.                    | Document separate Worker/D1/KV/secrets.                                                                                 | P1-010A added `ENVIRONMENT_SEPARATION_PLAN.md`, `PRODUCTION_DEPLOYMENT_SAFETY_CHECKLIST.md`, and `STAGING_VALIDATION_PLAN.md`; production config was not changed.                                                                                                                                       |

## P2: Commercial Optimization

| ID     | Area          | Opportunity                                                                | Value                                      |
| ------ | ------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| P2-001 | UI            | Mobile employee/follow-up screens need full responsive QA.                 | Faster staff use, fewer data entry errors. |
| P2-002 | Reports       | Add CSV/Excel/PDF exports after schema stabilization.                      | Owner accounting and external reporting.   |
| P2-003 | Permissions   | Fine-grained employee permissions by property/task.                        | Safer delegation.                          |
| P2-004 | Dashboard     | Backend-owned KPIs for occupancy, due today, overdue, monthly income.      | More reliable boss daily operations.       |
| P2-005 | Notifications | Due/overdue reminders and staff task reminders.                            | Better collection rate.                    |
| P2-006 | Settings      | Commercial system settings page for rent policy, period rule, WiFi policy. | Less code change for operations.           |

## P3: Later Versions

| ID     | Area           | Opportunity                                      |
| ------ | -------------- | ------------------------------------------------ |
| P3-001 | Payments       | Payment gateway integration.                     |
| P3-002 | Messaging      | WhatsApp/WeChat notification integration.        |
| P3-003 | AI             | AI anomaly detection and boss summaries.         |
| P3-004 | Tenant App     | Tenant-facing portal.                            |
| P3-005 | Mobile App     | Native mobile app after web workflow stabilizes. |
| P3-006 | Multi-language | Arabic/English/Chinese localization.             |

## P0-001D Minor-Unit Migration Review Addendum

Date: 2026-05-24, Asia/Dubai

P0-001 current status:

- Partial - minor-unit migration review and reconciliation gate ready.
- Not Verified because live write paths, production schema, backfill, dashboard readers, and production reconciliation remain unchanged.

New evidence:

- `P0_001D_STARTING_REVIEW_CONTEXT.md`
- `MONEY_DUAL_WRITE_MIGRATION_REVIEW.md`
- `MONEY_AUDIT_TRIAGE.md`
- `TOP_25_MONEY_RISKS.md`
- `MONEY_RECONCILIATION_GATE.md`
- `MONEY_RECONCILIATION_GATE_RESULT.md`
- `P0_001D_GO_NO_GO_CHECKLIST.md`
- `scripts/triage-money-audit.mjs`
- `scripts/reconcile-money-dual-write-gate.mjs`
- `npm run triage:money`
- `npm run gate:money-reconciliation`

Next allowed step:

- P0-001E local/staging dual-write rehearsal after human review.

Still forbidden:

- Production D1 migration.
- Remote D1 migration.
- Live dashboard reader switch.
- Live employee handover switch.
- Bulk auto-fixing all `REAL` / `Number` findings.

## Safe Next Implementation Order

1. Keep P0-007A smoke orchestration as the local preflight for future P0 work.
2. Move money precision to integer fils for live financial write paths.
3. Add receivables model and backend handover commit endpoint.
4. Add tenant/property/user membership model.
5. Move dashboard statistics to backend-owned calculations.
6. Promote clean schema and `/api/delete_session` production migration only after manual approval.

## Items Not To Auto-Fix Without Explicit Approval

- Financial formula changes.
- Production D1 migrations.
- Production Worker deployment.
- Auth/tenant model rewrite.
- Data backfills.
- Generated embedded Worker expansion.
- Deleting legacy business code.

## P0-001J Employee Entry Live Route Switch Rehearsal Addendum

Date: 2026-05-25, Asia/Dubai

P0-001 current status:

- Partial - employee entry live route switch rehearsal passed.
- Not Verified because production cutover, production migration, dashboard
  authority switch, and production reconciliation were not performed.

Completed safely:

- Added `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` guard to
  `POST /api/employee/entry`.
- Production and feature-flag-off behavior continue through the legacy route.
- Local/staging flag-on behavior runs adapter pre-validation before the
  existing legacy write path.
- Invalid adapter drafts are rejected before legacy write.
- Voided rows are skipped before legacy write.
- Adapter pre-validation records `audit_logs` and `entry_events` evidence.
- Added `tests/employee-entry-route-switch-rehearsal.spec.mjs`.
- Added `scripts/rehearse-employee-entry-route-switch.mjs`.

Verification:

- `npm run test:employee-entry-route-switch` passed.
- `npm run rehearse:employee-entry-route-switch` passed.

Still forbidden:

- Production D1 migration.
- Remote D1 migration.
- Production deployment.
- Dashboard/history live result switch.
- Live financial formula replacement.
- Deleting legacy route or legacy fields.

## P1-006 Embedded Worker Drift Gate Addendum

Date: 2026-05-24, Asia/Dubai

Current P1-006 status:

- Partial - dry-run generation ready, controlled write requires approval.

Completed safely:

- Confirmed local/source Worker validation uses `deploy-worker/wrangler.toml` -> `src/index.js`.
- Confirmed alternate embedded deploy config exists: `deploy-worker/wrangler.embedded.toml` -> `src/index.embedded.js`.
- Added `npm run audit:worker-drift`.
- Added `npm run verify:embedded-worker`.
- Added `npm run build:embedded:dry-run`.
- Generated `.tmp/embedded-worker-dry-run/index.embedded.generated.js` without overwriting the tracked artifact.

Key finding:

- Current `deploy-worker/src/index.embedded.js` is stale for P0-002C. It is missing `/api/staging/handover/commit`, `ENABLE_HANDOVER_ATOMIC_STAGING`, `HSC_ALLOWED_APP_ENVS`, `handover_commits`, `handover_commit_rows`, and `handover_idempotency_keys`.

Deploy gate:

- Source Worker local validation may continue.
- Embedded staging/prod deploy is NO-GO until controlled write is approved.
- Production deploy remains NO-GO.

Next allowed step:

- If embedded deploy path is required, run `NEXT_PROMPT_P1_006B_CONTROLLED_EMBEDDED_WRITE.md` after human approval.
- If embedded deploy path is not required for the next phase, P0-001E local/staging dual-write rehearsal can continue on source Worker.

## P1-006B Controlled Embedded Write Addendum

Date: 2026-05-24, Asia/Dubai

Current P1-006 status:

- Verified for deploy artifact freshness, production deploy still not approved.

Completed safely:

- Wrote `deploy-worker/src/index.embedded.js` from the dry-run generated artifact using `npm run build:embedded:write`.
- Backed up the prior artifact under `.tmp/embedded-worker-backups/`.
- Added `npm run smoke:embedded-with-worker`.
- Verified embedded local runtime behavior with `wrangler.embedded.toml`.

Evidence:

- `EMBEDDED_WORKER_CONTROLLED_WRITE_RESULT.md`
- `EMBEDDED_WORKER_RUNTIME_PROBE_RESULT.md`
- `WORKER_ENTRYPOINT_DRIFT_AUDIT.md`
- `EMBEDDED_WORKER_FRESHNESS_RESULT.md`
- `EMBEDDED_WORKER_GENERATION_DRY_RUN_RESULT.md`

Deploy gate:

- Local/source Worker development remains GO.
- Embedded artifact freshness is now verified.
- Staging/prod deploy remains MANUAL_REQUIRED / NO-GO until actual Cloudflare environment, D1/KV resources, secrets, and deploy command are explicitly approved.

## P0-001E Local/Staging Dual-Write Rehearsal Addendum

Date: 2026-05-24, Asia/Dubai

P0-001 current status:

- Partial - local/staging minor-unit dual-write rehearsal passed.
- Not Verified because live financial write paths, production schema, backfill,
  dashboard readers, and live handover flow remain unchanged.

Completed safely:

- Added `scripts/rehearse-money-dual-write-local-staging.mjs`.
- Added `tests/money-dual-write-local-staging.spec.mjs`.
- Added `npm run test:money-dual-write-local-staging`.
- Added `npm run rehearse:money-dual-write-local-staging`.
- Generated `P0_001E_LOCAL_STAGING_DUAL_WRITE_REHEARSAL_RESULT.md`.

Verification:

- Local/staging rehearsal patched 6 isolated D1 rows.
- Active reconciliation mismatches: 0.
- Active invalid rows: 0.
- Voided sample rows are audit-visible but excluded from active reconciliation.

Still forbidden:

- Production D1 migration.
- Remote D1 migration.
- Staging or production deploy.
- Live dashboard switch.
- Live employee handover switch.
- Deleting legacy decimal/REAL fields.

Next allowed step:

- P0-001F live write-path switch gate design after human review, or continue
  with P0-008/P0-006 design work. Do not execute production migration
  automatically.

## P0-001G Employee Entry Live Write Adapter Addendum

Date: 2026-05-24, Asia/Dubai

P0-001 current status:

- Partial - employee entry live write adapter rehearsal passed.
- Not Verified because the adapter is not wired into `/api/employee/entry`,
  production schema has not been migrated, and live dashboard/history readers
  are unchanged.

Completed safely:

- Added `modules/worker/employee-entry-live-write-adapter.mjs`.
- Added `tests/employee-entry-live-write-adapter.spec.mjs`.
- Added `scripts/rehearse-employee-entry-live-write-adapter.mjs`.
- Added `P0_001G_LIVE_WRITE_ADAPTER_REHEARSAL.md`.
- Generated `P0_001G_LIVE_WRITE_ADAPTER_REHEARSAL_RESULT.md`.

Verification:

- `npm run test:employee-entry-live-write-adapter` passed.
- `npm run rehearse:employee-entry-live-write-adapter` passed.
- Rehearsal scenarios: rent full payment, rent short payment, deposit
  collection, deposit refund, checkout deduction, arrears payment, invalid
  three-decimal money rejection, and voided-row exclusion.
- Adapter DB mutations: 0.

Still forbidden:

- Production D1 migration.
- Remote D1 migration.
- Staging or production deploy.
- Live dashboard switch.
- Live handover flow switch.
- Live `/api/employee/entry` route switch.
- Deleting legacy decimal/REAL fields.

Next allowed step:

- P0-001H local/staging route harness or staging-only adapter validation after
  human review.

## P0-001F Live Write Path Switch Gate Addendum

Date: 2026-05-24, Asia/Dubai

P0-001 current status:

- Partial - live write-path switch gate ready.
- Not Verified because live write paths still use legacy decimal/REAL-compatible values.

Completed safely:

- Added `scripts/audit-money-live-write-paths.mjs`.
- Added `npm run audit:money-live-writes`.
- Generated `MONEY_LIVE_WRITE_PATH_AUDIT_RESULT.md`.
- Added `MONEY_LIVE_WRITE_PATH_AUDIT.md`.
- Added `P0_001F_LIVE_WRITE_PATH_SWITCH_GATE.md`.
- Added `MONEY_LIVE_WRITE_SWITCH_TEST_PLAN.md`.
- Added `NEXT_PROMPT_P0_001G_LOCAL_STAGING_LIVE_WRITE_ADAPTER_REHEARSAL.md`.

Findings:

- 19 financial SQL write statements scanned.
- 10 P0 live decimal authority write statements remain.
- 92 Worker money parsing / rounding patterns were identified.
- Highest-priority next candidate is `/api/employee/entry` adapter rehearsal.

Still forbidden:

- Production D1 migration.
- Remote D1 migration.
- Staging or production deploy.
- Live dashboard switch.
- Live employee handover switch.
- Deleting legacy decimal/REAL fields.
- Treating frontend totals as authority.

Next allowed step:

- P0-001G local/staging live write adapter rehearsal. It must be non-invasive,
  must not wire into live routes, and must keep P0-001 Partial.

## P0-001H Employee Entry Adapter Route Harness Addendum

Date: 2026-05-24, Asia/Dubai

P0-001 current status:

- Partial - local/staging employee entry adapter route harness passed.
- Not Verified because live `/api/employee/entry`, live dashboard/history, and
  production schema remain unchanged.

Completed safely:

- Added `POST /api/staging/employee-entry/adapter-draft`.
- Added `P0_001H_EMPLOYEE_ENTRY_ADAPTER_ROUTE_HARNESS.md`.
- Added `tests/employee-entry-adapter-staging-endpoint.spec.mjs`.
- Added `scripts/rehearse-employee-entry-adapter-staging-endpoint.mjs`.
- Generated `EMPLOYEE_ENTRY_ADAPTER_STAGING_ENDPOINT_REHEARSAL_RESULT.md`.
- Updated API and DB static scan reports.

Verification:

- `npm run test:employee-entry-adapter-staging-endpoint` passed.
- `npm run rehearse:employee-entry-adapter-staging-endpoint` passed.
- `npm run check` passed with 170 tests.
- `npm run smoke:with-worker` passed.
- `npm run verify:clean-d1` passed.
- `npm run test:employee-entry-live-write-adapter` passed.
- `npm run rehearse:employee-entry-live-write-adapter` passed.

Still forbidden:

- Production D1 migration.
- Remote D1 migration.
- Staging or production deploy.
- Live dashboard switch.
- Live handover flow switch.
- Live `/api/employee/entry` route switch.
- Deleting legacy decimal/REAL fields.

Next allowed step:

- A separate human-reviewed live-route cutover or staging cutover gate. P0-001
  must remain Partial until live accounting authority and reconciliation are
  approved.

## P0-001I Employee Entry Live Route Cutover Gate Addendum

Date: 2026-05-24, Asia/Dubai

P0-001 current status:

- Partial - local/staging employee entry adapter route harness passed.
- P0-001I is a gate only, not a live switch.

Completed safely:

- Added `P0_001I_EMPLOYEE_ENTRY_LIVE_ROUTE_CUTOVER_CONTEXT.md`.
- Added `P0_001I_LIVE_ROUTE_CUTOVER_DECISION_MATRIX.md`.
- Added `P0_001I_LIVE_ROUTE_CUTOVER_BLUEPRINT.md`.
- Added `EMPLOYEE_ENTRY_LIVE_ROUTE_CUTOVER_TEST_PLAN.md`.
- Added `P0_001I_GO_NO_GO_CHECKLIST.md`.
- Added `NEXT_PROMPT_P0_001J_EMPLOYEE_ENTRY_LIVE_ROUTE_SWITCH_REHEARSAL.md`.
- `npm run check` passed with 170 tests and Worker dry-run builds.
- Test orchestration was stabilized only: full `npm test` is serialized and
  handover staging endpoint tests use dynamic ports.

Still forbidden:

- Production D1 migration.
- Remote D1 migration.
- Staging or production deploy.
- Live dashboard switch.
- Live handover flow switch.
- Live `/api/employee/entry` route switch without the next approved rehearsal.

Next allowed step:

- P0-001J local/staging live-route switch rehearsal after human approval.

## P0-001K Employee Entry Staging QA Gate Addendum

Date: 2026-05-25, Asia/Dubai

P0-001 current status:

- Partial - employee entry staging QA package ready.
- Not Verified because real staging QA, production cutover, production
  migration/backfill, dashboard authority switch, tenant isolation, and
  receivables are not complete.

Completed safely:

- Added `P0_001K_P0_001J_DIFF_REVIEW.md`.
- Added `EMPLOYEE_ENTRY_STAGING_QA_GUIDE.md`.
- Added `P0_001K_CUTOVER_READINESS_CHECKLIST.md`.
- Added `EMPLOYEE_ENTRY_LEGACY_VS_ADAPTER_COMPARISON.md`.
- Added `EMPLOYEE_ENTRY_ROLLBACK_DRILL_RESULT.md`.
- Added `EMPLOYEE_ENTRY_CUTOVER_DEPLOY_ARTIFACT_REVIEW.md`.
- Added `tests/employee-entry-production-behavior-lock.spec.mjs`.
- Added `scripts/compare-employee-entry-legacy-vs-adapter.mjs`.
- Added `scripts/rehearse-employee-entry-rollback.mjs`.

Verification:

- `npm run compare:employee-entry-routes` passed with 0 unexpected differences.
- `npm run rehearse:employee-entry-rollback` passed.
- `npm run test:employee-entry-production-lock` passed.
- Existing P0-001J route-switch and broad safety gates remain required in final
  validation.

Still forbidden:

- Production D1 migration.
- Remote D1 migration.
- Staging or production deploy by automation.
- Production adapter cutover.
- Dashboard authority switch.
- Deleting legacy fields or route.
- Marking P0-001 Verified.

Next allowed step:

- Real staging QA can be prepared after human confirmation of staging env,
  entrypoint, D1 backup/rollback, and feature flag configuration. Production
  cutover remains blocked.

## P0-001L Real Staging QA Preflight Addendum

Date: 2026-05-25, Asia/Dubai

P0-001 current status:

- Partial - real staging QA package ready, manual staging inputs required.

Completed safely:

- Added `P0_001L_STAGING_ENVIRONMENT_PREFLIGHT.md`.
- Added `STAGING_QA_MANUAL_REQUIRED.md`.
- Added `EMPLOYEE_ENTRY_REAL_STAGING_QA_PLAN.md`.
- Added `EMPLOYEE_ENTRY_REAL_STAGING_QA_COMMANDS.md`.
- Added `P0_001L_PRODUCTION_CUTOVER_NO_GO_REVIEW.md`.
- Added `scripts/qa-employee-entry-real-staging.mjs`.
- Added `EMPLOYEE_ENTRY_REAL_STAGING_QA_DRY_RUN_RESULT.md`.
- Added `npm run qa:employee-entry-staging`.

Verification:

- `npm run qa:employee-entry-staging` returned `MANUAL_REQUIRED` without
  writing remote/staging/prod data.

Still forbidden:

- Production D1 migration.
- Remote D1 migration.
- Staging or production deploy by automation.
- Real staging writes until staging URL, D1, backup, rollback, credentials, and
  entrypoint are human-confirmed.
- Production adapter cutover.
- Marking P0-001 Verified.

## P0-003C Backend Totals Live Authority Gate Addendum

Date: 2026-05-25, Asia/Dubai

P0-003 current status:

- Partial - backend totals live authority gate ready.

Completed safely:

- Added backend totals live authority gate document.
- Added backend totals live gate dry-run script.
- Added next-step P0-003D prompt.

Verification:

- `npm run test:backend-totals` passed.
- `npm run rehearse:backend-totals` passed.
- `npm run gate:backend-totals-live` returned `MANUAL_REQUIRED` without
  changing live responses.

Still forbidden:

- Live dashboard switch.
- Live financial formula change.
- Treating frontend totals as authority.
- Production deployment or migration.

Blockers before live authority:

- P0-001 reconciliation/manual review.
- P0-008 receivables.
- P0-006 tenant/property scope.
- Staging read-only comparison and human accounting review.

## P0-008B Receivables Implementation Readiness Gate Addendum

Date: 2026-05-25, Asia/Dubai

P0-008 current status:

- Partial - receivables implementation readiness gate ready.

Completed safely:

- Added receivables readiness gate document.
- Added read-only receivables readiness script.
- Added next-step P0-008C prompt.

Verification:

- `npm run gate:receivables` returned `MANUAL_REQUIRED`.

Still forbidden:

- Production receivables table creation.
- Production or remote D1 migration.
- Dashboard/arrears live switch.
- Treating legacy `arrear_tasks` as final accounting authority.

Blockers before production:

- Receivables migration draft and local/staging tests.
- P0-001 minor-unit migration/reconciliation.
- P0-003 backend totals live authority.
- P0-006 tenant/property scope.
- Human accounting approval.

## P0-006B Tenant / Property Scope Readiness Gate Addendum

Date: 2026-05-25, Asia/Dubai

P0-006 current status:

- Partial - tenant/property scope readiness gate ready.

Completed safely:

- Added tenant/property scope readiness gate document.
- Added read-only tenant scope gate script.
- Added next-step P0-006C prompt.

Verification:

- `npm run gate:tenant-scope` returned `MANUAL_REQUIRED`.

Still forbidden:

- Global tenant rewrite.
- Production schema migration.
- Production auth behavior changes.
- Removing legacy `CORPID` fallback.

Blockers before production:

- Human decision on shared Worker/D1 vs isolated deployment per customer.
- Company/property membership model.
- Legacy data backfill to property scope.
- Cross-tenant denial tests.
- Server-side scope filters on every sensitive API.

## P1-002B Runtime DDL Removal Readiness Gate Addendum

Date: 2026-05-25, Asia/Dubai

P1-002 current status:

- Partial - runtime DDL removal readiness gate ready.

Completed safely:

- Added runtime DDL removal readiness document.
- Added read-only runtime DDL removal gate script.
- Added next-step P1-002C prompt.

Verification:

- `npm run audit:runtime-ddl` wrote 182 findings.
- `npm run gate:runtime-ddl-removal` returned `MANUAL_REQUIRED`.

Still forbidden:

- Deleting runtime DDL from production Worker.
- Running production or remote migration.
- Using runtime DDL to hide failed production migration.

Blockers before removal:

- Staging migration proof.
- Production backup/rollback plan.
- P0-001/P0-006/P0-008 schema decisions.
- Embedded/source artifact verification after any future removal.

## P1-009A Observability / Monitoring Addendum

Date: 2026-05-25, Asia/Dubai

P1-009 current status:

- Partial - observability and monitoring readiness plan added.

Completed safely:

- Added structured logging and error-monitoring plan.
- Added observability GO/NO-GO checklist.
- Added read-only observability readiness script.

Verification:

- `npm run audit:observability` returned `MANUAL_REQUIRED`.

Still required before production:

- Assign P0/P1 alert owner.
- Confirm production log retention.
- Confirm PII/secrets redaction policy.
- Decide whether Cloudflare logs are sufficient for launch.

## P1-010B Environment Separation Hardening Addendum

Date: 2026-05-25, Asia/Dubai

P1-010 current status:

- Partial - environment separation hardening review added.

Completed safely:

- Added `ENVIRONMENT_SEPARATION_HARDENING_REVIEW.md`.
- Added `ENVIRONMENT_SEPARATION_AUDIT_RESULT.md`.
- Added read-only `scripts/audit-environment-separation.mjs`.
- Added `npm run audit:env-separation`.

Verification:

- `npm run audit:env-separation` returned `MANUAL_REQUIRED`.

Still required before staging/prod:

- Confirm separate staging Worker, D1, KV, `APP_ENV`, feature flags, secrets,
  backup, rollback, and deploy entrypoint.
- Do not use checked-in shared Worker/D1/KV config as evidence of environment
  separation.

Still forbidden:

- Production deploy.
- Staging deploy by automation.
- Production or remote D1 migration.
- Production config modification without human approval.

## Commercial Launch Readiness Gate Addendum

Date: 2026-05-25, Asia/Dubai

Current launch gate:

- Status: `PRODUCTION_NO_GO`
- Evidence: `COMMERCIAL_LAUNCH_READINESS_MATRIX.md`
- Gate command: `npm run gate:commercial-launch`

Blocking categories:

- P0-001 money precision remains Partial and reconciliation is not production
  approved.
- P0-002 handover atomic remains staging/local only.
- P0-003 backend totals authority is not live switched.
- P0-006 tenant/property scope remains implementation-gated.
- P0-008 receivables remains design/readiness-gated.
- Real staging QA inputs are missing.
- Runtime DDL removal, observability, environment separation, audit coverage,
  rollback readiness, API permissions, and table readiness still require manual
  approval.

Allowed next work:

- Local/staging dry-run validation.
- Manual QA preparation.
- Read-only audit expansion.

Forbidden without human approval:

- Production deploy.
- Staging deploy.
- Remote or production D1 migration.
- Production feature flag enablement.
- Live accounting authority switch.

## STAGING-QA-004 Backlog Addendum

Date: 2026-05-25, Asia/Dubai

Current staging QA status:

- `READY_FOR_STAGING_DRY_RUN_COMPLETE_MANUAL_INPUTS_REQUIRED`

Completed:

- Staging resource evidence is filled into
  `STAGING_QA_EVIDENCE_TEMPLATE.md`.
- Staging config consistency review is complete.
- Staging URL is present and staging-named.
- `npm run qa:employee-entry-staging` remains dry-run only without confirmation
  flags.

Still required before real staging write QA:

- Set staging secrets outside Git.
- Create or confirm staging test accounts.
- Execute staging D1 backup and record evidence.
- Exercise rollback by feature flag off.
- Confirm staging D1 schema/migration state.
- Confirm Cloudflare Dashboard Worker URL and production URL exclusion.
- Open `STAGING-DB-001` if staging schema/bootstrap is required.

Production remains NO-GO.

# P0-001I Employee Entry Live Route Cutover Context

Date: 2026-05-24

Scope: review gate only. This file summarizes what is known after P0-001H and what must be decided before any live `/api/employee/entry` cutover.

## Current Evidence

| Area                    | Evidence                                                                                                 | Status                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Money helper            | `modules/finance/money.mjs`, `npm run test:money`                                                        | Guardrails ready                   |
| Dual-write prep         | `modules/finance/money-dual-write.mjs`, `npm run test:money-dual-write`                                  | Local/staging preparation only     |
| Employee entry adapter  | `modules/worker/employee-entry-live-write-adapter.mjs`, `npm run test:employee-entry-live-write-adapter` | Non-invasive adapter ready         |
| Staging adapter route   | `POST /api/staging/employee-entry/adapter-draft`, `npm run test:employee-entry-adapter-staging-endpoint` | Local/staging route harness passed |
| Rehearsal evidence      | `EMPLOYEE_ENTRY_ADAPTER_STAGING_ENDPOINT_REHEARSAL_RESULT.md`                                            | Legacy live tables unchanged       |
| Live route              | `/api/employee/entry`                                                                                    | Still legacy                       |
| Production schema       | D1 production migration                                                                                  | Not executed                       |
| Dashboard/history reads | Legacy active readers                                                                                    | Not switched                       |

## What P0-001H Proved

- A local/staging Worker route can call the employee entry adapter.
- Production mode disables the route with `404`.
- Feature flag off disables the route with `403 FEATURE_DISABLED`.
- Server-side auth and employee/staff role checks work.
- Owner/manager submit is rejected.
- The route returns transaction/session/deposit/arrear write plans without writing legacy live tables.
- Invalid money and voided rows are handled by the adapter.

## What P0-001H Did Not Prove

- It did not switch the live `/api/employee/entry` route.
- It did not write minor-unit fields to live tables.
- It did not migrate production schema.
- It did not prove owner dashboard/history reads use minor-unit authority.
- It did not prove receivables lifecycle consistency.
- It did not prove multi-tenant isolation.
- It did not prove the live employee handover flow is atomic.

## Cutover Risk

The live route currently performs real legacy writes to `sessions`, `transactions`, `deposit_ledger`, `arrear_tasks`, `entry_events`, and `audit_logs`. Any cutover must be staged, feature-flagged, reversible, and reconciled against legacy output before production.

## Current Recommendation

The next safe task is not a production cutover. It should be a local/staging-only live-route switch rehearsal gate that keeps production disabled, records before/after snapshots, verifies dashboard unchanged behavior, and proves rollback by feature flag.

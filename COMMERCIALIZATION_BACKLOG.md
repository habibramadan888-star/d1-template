# Commercialization Backlog

Date: 2026-05-23  
Mode: NIGHT SHIFT V2  
Production deploy: not executed  
Production database mutation: not executed

## Executive Status

The project is not yet ready for commercial SaaS launch. Static checks, local Worker startup, and unauthenticated smoke checks now pass, but commercial blockers remain in finance precision, tenant isolation, migration discipline, and audited financial mutation flows.

## P0: Cannot Launch

| ID     | Area         | Problem                                                                                                        | Impact                                                           | Required Fix                                                                                  | Verification                                                             |
| ------ | ------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| P0-001 | Finance      | Money uses `REAL`, decimal JS `Number`, and frontend decimal calculations.                                     | Rent, deposit, arrears, refunds, and handover totals can drift.  | Move new financial writes to integer minor units or decimal-safe helpers with reconciliation. | Finance tests for rent, deposit, arrears, refunds, and handover.         |
| P0-002 | Finance      | Employee handover is uploaded entry by entry, not as a backend atomic session commit.                          | Partial success can create incomplete handovers.                 | Add backend session commit endpoint with idempotency key and transaction-like acceptance.     | Duplicate submit and weak-network tests.                                 |
| P0-003 | Finance      | Backend accepts frontend-provided session totals.                                                              | Staff browser can become accounting authority.                   | Backend recomputes cash handover, bank transfer, and gross received from accepted rows.       | Compare UI summary to backend summary.                                   |
| P0-004 | Data         | `/api/delete_session` hard deletes financial records.                                                          | Audit trail and dispute evidence can be lost.                    | Replace normal deletion with void/soft-delete and immutable audit events.                     | Delete test proves rows remain voided.                                   |
| P0-005 | Database     | Clean D1 bootstrap is incomplete; employee entry fails because `transactions` is missing.                      | New customer environment fails on first employee entry.          | Build ordered migrations for all business tables, starting with `transactions`.               | New local D1 starts from zero and `npm run smoke:employee-entry` passes. |
| P0-006 | Auth/Tenancy | `employee_users` is not tenant-scoped and `CORPID` is static.                                                  | Future multi-customer SaaS can leak or collide staff identities. | Add company/tenant/property model and user membership scope.                                  | Cross-tenant denial tests.                                               |
| P0-007 | Auth         | Full authenticated employee/owner business flows are not yet verified beyond login and one staff-denial check. | Entry/export and dashboard regressions may still be hidden.      | Extend authenticated smoke to employee entry/export and owner dashboard APIs.                 | Authenticated flow tests pass locally.                                   |
| P0-008 | Accounting   | No formal `receivables` table exists.                                                                          | Arrears are not a first-class accounting lifecycle.              | Introduce receivables before payments/arrear tasks.                                           | Short-pay and repayment lifecycle tests.                                 |

## P1: Must Fix Before Commercial Release

| ID     | Area           | Problem                                                                              | Impact                                               | Required Fix                                                        | Verification                                         |
| ------ | -------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| P1-001 | Audit          | Audit logs and entry events are split and not complete for every financial mutation. | Accountability gaps.                                 | Unified immutable `audit_events` model.                             | Before/after audit tests.                            |
| P1-002 | Data           | Runtime `CREATE TABLE` / `ALTER TABLE` exists in request paths.                      | Production traffic can mutate schema unexpectedly.   | Move schema changes to migrations only.                             | Static scan finds no schema DDL in request handlers. |
| P1-003 | Finance        | Rent configuration is stored as JSON without effective dates.                        | Historical receivables can change if config changes. | Version rent config with `effective_from` / `effective_to`.         | Old sessions still use old rent.                     |
| P1-004 | Timezone       | Date logic mixes browser local time, UTC ISO, and partial Dubai helpers.             | Overdue and due-soon statuses can be wrong.          | Centralize Dubai business-date helpers on server.                   | Boundary tests around midnight Asia/Dubai.           |
| P1-005 | Security       | Default employee seed behavior is present.                                           | Production default credentials risk.                 | Restrict seeding to local/dev setup only and document it.           | Production config cannot create default users.       |
| P1-006 | Worker         | `src/index.embedded.js` is generated/stale relative to source.                       | Embedded deploy path can drift from source behavior. | Regenerate only in a controlled deploy-prep step, not during audit. | Diff/generated hash check.                           |
| P1-007 | API            | API inventory is static/manual, not generated as part of CI quality gate.            | Route docs can drift.                                | Promote audit scripts to CI checks.                                 | `npm run audit:api` gates PRs.                       |
| P1-008 | UX Reliability | Employee export/preview and owner dashboard need authenticated regression checks.    | Commercial users may hit button failures after auth. | Add Browser/E2E smoke after local secrets exist.                    | Authenticated smoke scripts pass.                    |
| P1-009 | Observability  | No production error monitoring plan.                                                 | Silent failures in customer use.                     | Add structured logs and Cloudflare alerts/Sentry-equivalent plan.   | Synthetic error captured in staging.                 |
| P1-010 | Environments   | Staging and production separation is not documented enough for commercial rollout.   | Test changes may affect production.                  | Document separate Worker/D1/KV/secrets.                             | Staging deploy checklist passes.                     |

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

## Safe Next Implementation Order

1. Extend authenticated smoke tests to employee entry/export and owner dashboard APIs.
2. Convert hard delete to void/soft-delete in a dedicated branch with tests.
3. Create clean D1 migration chain using integer money fields for new schema.
4. Add receivables model and backend handover commit endpoint.
5. Add tenant/property/user membership model.
6. Move dashboard statistics to backend-owned calculations.

## Items Not To Auto-Fix Without Explicit Approval

- Financial formula changes.
- Production D1 migrations.
- Production Worker deployment.
- Auth/tenant model rewrite.
- Data backfills.
- Generated embedded Worker expansion.
- Deleting legacy business code.

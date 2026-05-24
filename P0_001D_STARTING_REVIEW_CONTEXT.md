# P0-001D Starting Review Context

Generated: 2026-05-24, Asia/Dubai

Scope: P0-001D-GATE review only. No live financial formula, dashboard result, employee handover flow, database schema, production config, production migration, remote D1 migration, or production deploy was changed.

## What P0-001C Proved

- `modules/finance/money-dual-write.mjs` can generate deterministic draft `*_fils` patches from legacy decimal fields without mutating source records or database rows.
- `tests/money-dual-write.spec.mjs` verifies safe patch creation, invalid AED precision rejection, explicit negative handling, and legacy/fils mismatch reporting.
- `scripts/rehearse-money-dual-write.mjs` can inspect local D1 schema and produce `MONEY_DUAL_WRITE_REHEARSAL_RESULT.md`.
- `migration-drafts/005_money_minor_units_dual_write_draft.sql` proposes nullable integer-fils companion columns beside legacy decimal fields.
- `100.999` AED is intentionally rejected; this is a guardrail, not a rehearsal defect.

## What P0-001C Did Not Prove

- No live write path writes `*_fils` into `transactions`, `deposit_ledger`, `arrears`, `arrear_tasks`, or `sessions`.
- No production D1 migration was executed.
- No remote D1 migration was executed.
- No owner dashboard or history reader was switched to `*_fils`.
- No employee live handover flow was switched.
- No production backfill, rollback drill, or staging deployment was completed.

## Paths Already Using Fils

- `modules/finance/money.mjs` parses AED into integer fils for tests and rehearsal modules.
- `modules/finance/backend-totals.mjs` computes rehearsal totals in integer fils.
- `modules/finance/handover-atomic.mjs` uses backend totals and money helpers for non-live handover rehearsal.
- `migrations/local/002_handover_atomic_staging.sql` stores staging handover backend/frontend totals as integer fils.
- `migration-drafts/005_money_minor_units_dual_write_draft.sql` proposes legacy-table `*_fils` fields.

## Paths Still Legacy Decimal / REAL

- `migrations/local/001_clean_legacy_bootstrap.sql` intentionally preserves legacy `REAL` fields for clean-bootstrap compatibility.
- Live `deploy-worker/src/index.js` still contains legacy amount parsing and write/read paths.
- Current legacy `transactions`, `deposit_ledger`, `arrears`, `arrear_tasks`, and `sessions` rows are not dual-written.
- Frontend entry and owner dashboard surfaces still contain display/input numeric operations and are not accounting authority.

## Live Write Paths Not To Touch In P0-001D

- `/api/employee/entry`
- legacy session save/history paths
- legacy `transactions` writes
- legacy `deposit_ledger` writes
- legacy `arrears` and `arrear_tasks` writes
- owner dashboard/history readers

## Dependency Map

| Dependency                           | Why It Matters For Minor Units                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| P0-003 live backend totals authority | Dashboard/history should switch only after backend recomputation and reconciliation gates pass.                                      |
| P0-008 receivables                   | Arrears, tail balances, payment allocation, and short-pay lifecycle need a formal source of truth before production money migration. |
| P0-006 tenant isolation              | Production SaaS migration must scope all rows by tenant/company/property before multi-customer rollout.                              |
| P1-006 embedded Worker drift         | If embedded Worker is the deploy artifact, source changes must be generated and diff-reviewed before staging/production.             |

## Missing P0-001C Review Inputs

The task referenced these files, but they do not currently exist as standalone documents:

- `MONEY_DUAL_WRITE_SOURCE_OF_TRUTH.md`
- `MONEY_DUAL_WRITE_MIGRATION_PLAN.md`
- `MONEY_DUAL_WRITE_RECONCILIATION_RESULT.md`
- `MONEY_DUAL_WRITE_READINESS_GATE.md`
- `HANDOVER_STAGING_MONEY_DUAL_WRITE_REVIEW.md`

Equivalent evidence currently exists in:

- `MONEY_DUAL_WRITE_PREPARATION_PLAN.md`
- `MONEY_DUAL_WRITE_GO_LIVE_GATE.md`
- `MONEY_DUAL_WRITE_REHEARSAL_RESULT.md`
- `HANDOVER_STAGING_ENDPOINT_IMPLEMENTATION.md`
- `HANDOVER_STAGING_LEGACY_TABLES_UNCHANGED_RESULT.md`
- `HANDOVER_STAGING_DASHBOARD_UNCHANGED_RESULT.md`

## Current Review Conclusion

P0-001 can advance to a local/staging dual-write rehearsal only after this review gate classifies raw money audit findings, confirms the draft migration is local/staging-only, and defines reconciliation fail conditions. Production migration remains explicitly blocked.

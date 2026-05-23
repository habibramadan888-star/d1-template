# Migration Promotion Checklist

Date: 2026-05-23  
Status: required review gate  
Production migration: not executed  
Remote D1 mutation: not executed

## Purpose

This checklist defines when a SQL draft in `migration-drafts/` is allowed to move into the executable `migrations/` directory. It exists because the project currently has a confirmed clean-bootstrap blocker, but commercial data must not be repaired with ad hoc request-path schema changes.

## Promotion Rule

A draft migration may be promoted only when every gate below is checked and recorded in `RUN_REPORT.md`.

No single engineer or AI agent should promote the draft directly to production without a reviewed rollback and reconciliation plan.

## Gate 1: Scope Lock

Required:

- Confirm the migration purpose in one sentence.
- Confirm whether it is additive, destructive, or data-transforming.
- Confirm all changed tables.
- Confirm all new API routes or existing routes affected.
- Confirm whether owner, employee, or admin behavior changes.

Pass condition:

- For `002_commercial_bootstrap`, the first executable version must be additive only.
- It must not drop, rename, or overwrite existing financial tables.

## Gate 2: Financial Safety

Required:

- All new money fields use integer AED fils.
- No commercial money fields use `REAL`, `FLOAT`, or `DOUBLE`.
- No dashboard or handover total is accepted from the browser as accounting truth.
- Handover totals must be recomputable from `transactions` and `payments`.
- Deposit liability must be reconstructable from `deposit_ledger`.
- Receivable status must be reconstructable from `receivables` and `payments`.

Pass condition:

- Static tests prove the SQL has no floating money types.
- Finance tests cover rent collection, short payment, arrear repayment, deposit in, deposit refund, and voided session.

## Gate 3: Multi-Tenant Isolation

Required:

- Every business table has `company_id`.
- Every property-scoped table has `property_id`.
- Every query added or changed by the migration plan includes tenant/property scope.
- Legacy `CORPID` usage is documented as a compatibility layer, not the commercial tenant model.

Pass condition:

- Tests prove employee cannot read owner-only APIs.
- Tests prove one company/property cannot read another company/property once multi-tenant fixtures exist.

## Gate 4: Audit And Soft-Delete

Required:

- Financial records are voided, not physically deleted.
- Voids require `voided_at`, `voided_by`, and `void_reason`.
- Every session submit, export, payment, receivable change, deposit movement, permission denial, and manual override emits an audit event.
- Audit events store actor, role, entity, before state where available, after state where available, reason where required, and timestamp.

Pass condition:

- Tests prove voiding preserves original financial rows.
- Tests prove audit rows are created for submit, export, void, and denial.

## Gate 5: Legacy Compatibility

Required:

- Inventory all existing production/local legacy tables before migration.
- Map each legacy field to the target schema or mark it intentionally ignored.
- Document how old `REAL` amounts convert to integer fils.
- Document how missing company/property fields are seeded.
- Document how old sessions, transactions, arrears, deposit rows, and entry events are reconciled.

Pass condition:

- A dry-run reconciliation report compares old totals and new totals.
- Differences are listed by session, bed, transaction, and amount.
- No unmatched financial row is silently ignored.

## Gate 6: Backfill Plan

Required:

- Backfill script must run against a copy or staging database before production.
- Backfill must be idempotent.
- Backfill must write audit or migration log rows.
- Backfill must not mutate legacy source rows during the first pass.
- Backfill must produce counts for inserted, skipped, conflicted, and failed rows.

Pass condition:

- Staging backfill can be run twice without duplicate accounting rows.
- Reconciliation output is stable after the second run.

## Gate 7: Rollback Plan

Required:

- Export remote D1 backup before any production migration.
- Keep the pre-migration Worker version available for rollback.
- Prefer forward rollback migrations over destructive drops.
- If rollback requires restoring D1 from backup, write the exact restore procedure before starting.
- Define the maximum acceptable downtime and data-loss window.

Pass condition:

- Rollback has been tested on staging or an isolated local copy.
- The rollback plan identifies which post-migration writes cannot be automatically preserved.

## Gate 8: Local And Staging Validation

Required commands:

```bash
npm run check
npm run migration:rehearse
npm run smoke
npm run smoke:auth
npm run smoke:employee-entry
```

Required migration checks:

```bash
wrangler d1 execute homelink --local --persist-to <temp-dir> --config wrangler.toml --file <candidate-migration.sql> --yes
wrangler d1 migrations apply homelink --local --persist-to <temp-dir>
```

Pass condition:

- Clean local D1 starts from zero tables and reaches a usable schema.
- `npm run migration:rehearse` validates the draft in a disposable local D1 state directory.
- Existing local fixture D1 remains compatible.
- Staging D1 migration and rollback are documented.

## Gate 9: Production Cutover

Required:

- Freeze employee submissions during the migration window or use a write queue.
- Confirm no active handover session is half-submitted.
- Export production D1 backup.
- Record current Worker version.
- Apply migration to staging first.
- Apply production migration only after staging passes.
- Smoke-test employee and owner pages after migration.

Pass condition:

- Owner dashboard loads.
- Employee login works.
- Employee entry/export works.
- Arrear follow-up loads.
- API auth denial still works.

## Gate 10: Post-Migration Monitoring

Required:

- Monitor Worker errors.
- Monitor D1 query errors.
- Monitor login failures.
- Monitor duplicate idempotency keys.
- Monitor receivable/payment imbalance.
- Monitor deposit negative balances.
- Monitor tenant/property scope errors.

Pass condition:

- First hour and first business day results are recorded in `RUN_REPORT.md`.

## No-Go Conditions

Do not promote or run the migration if any condition below is true:

- SQL contains `REAL`, `FLOAT`, or `DOUBLE` for commercial money.
- SQL contains `DROP TABLE` for a financial table.
- SQL contains unrestricted `DELETE FROM` for a financial table.
- Any production secret is missing or copied into source control.
- Auth smoke fails.
- Employee can access owner-only APIs.
- Clean local D1 cannot start.
- Backfill reconciliation has unexplained differences.
- Rollback procedure is not written.
- Production and staging environments are not clearly separated.

## Required Approval Record

Before promotion, add a short approval block to the migration PR or commit message:

```text
Migration approval:
- Scope reviewed:
- Financial tests passed:
- Tenant isolation reviewed:
- Backup completed:
- Backfill dry-run completed:
- Rollback tested:
- Approver:
- Date:
```

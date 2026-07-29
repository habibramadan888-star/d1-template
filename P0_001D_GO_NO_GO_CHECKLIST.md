# P0-001D GO / NO-GO Checklist

Generated: 2026-05-24, Asia/Dubai

Scope: P0-001D gate only. No production migration, remote D1 migration, production deploy, live formula switch, dashboard switch, or live handover switch was performed.

## GO For P0-001E Local/Staging Dual-Write Rehearsal

- Migration draft reviewed: `MONEY_DUAL_WRITE_MIGRATION_REVIEW.md`.
- Money dual-write helper tests pass: `npm run test:money-dual-write`.
- Reconciliation dry-run exists: `npm run gate:money-reconciliation`.
- Reconciliation result is not `FAIL` or `BLOCKED`; current state is `MANUAL_REQUIRED`.
- Staging handover endpoint already stores backend/frontend totals in `*_fils`.
- Dashboard unchanged evidence exists: `HANDOVER_STAGING_DASHBOARD_UNCHANGED_RESULT.md`.
- Legacy live table unchanged evidence exists: `HANDOVER_STAGING_LEGACY_TABLES_UNCHANGED_RESULT.md`.
- `audit:money` triage completed: `MONEY_AUDIT_TRIAGE.md`.
- Top money risks classified: `TOP_25_MONEY_RISKS.md`.
- No production migration executed.
- No remote D1 migration executed.
- No live financial formula changed.
- No human review item currently blocks local/staging-only rehearsal.

## NO-GO For Production Migration

- Raw audit risks remain high and require staged triage, not bulk editing.
- Production backfill has not been reviewed or rehearsed against a production copy.
- P0-003 live backend totals authority is not switched.
- P0-008 receivables model is not implemented.
- P0-006 tenant isolation is not implemented.
- P1-006 embedded Worker drift remains unresolved for any deployment workflow that uses embedded artifacts.
- Real staging deploy has not been validated.
- Reconciliation has not been run on a production clone or approved staging data.
- Rollback has not been tested.
- Human approval is missing for production migration, backfill, and reader switch.

## Human Review Required

- Approve whether P0-001E may apply `005_money_minor_units_dual_write_draft.sql` to local/staging only.
- Decide whether local/staging rehearsal should cover all proposed fields or a smaller first slice.
- Review `TOP_25_MONEY_RISKS.md`, especially live Worker money parsing and legacy schema fields.
- Decide when P1-006 embedded Worker drift should be handled relative to staging endpoint and money migration work.
- Confirm production migration remains forbidden until P0-003, P0-008, and P0-006 dependencies are resolved or explicitly scoped.

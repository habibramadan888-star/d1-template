# P0-001I GO / NO-GO Checklist

Date: 2026-05-24

## GO For Next Local/Staging Rehearsal

- P0-001H endpoint tests passed.
- P0-001H endpoint rehearsal passed.
- `npm run check` passed after P0-001H.
- `npm run smoke:with-worker` passed.
- `npm run verify:clean-d1` passed.
- `npm run security:secrets` passed.
- Live `/api/employee/entry` remains unchanged.
- Dashboard/history output remains unchanged.
- No production or remote D1 migration was executed.
- No production deployment was executed.
- Feature flag strategy is documented.
- Rollback by feature flag is documented.

## NO-GO For Production Cutover

- Production schema has not been migrated to authoritative minor-unit fields.
- Production-copy reconciliation has not been run.
- Live dashboard/history readers still use legacy authority.
- P0-003 live backend totals authority is not switched.
- P0-008 receivables model is not implemented.
- P0-006 tenant isolation is not implemented.
- Live handover atomic commit remains separate P0 work.
- Human accounting review has not approved migration/backfill.
- Staging QA has not completed with real workflow data.
- Rollback has not been exercised in staging.

## Human Approval Required

- Whether future local/staging live-route rehearsal should write to legacy tables with adapter pre-validation or write to separate staging tables.
- Whether `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` is the final flag name.
- Whether production should keep legacy route behavior or explicitly reject adapter mode.
- Which fields must be reconciled before production migration.
- Whether P0-008 receivables should be completed before any production cutover.
- Whether P0-006 tenant isolation must precede commercial customer rollout.

## Status

P0-001 remains:

`Partial - local/staging employee entry adapter route harness passed`

P0-001 is not Verified.

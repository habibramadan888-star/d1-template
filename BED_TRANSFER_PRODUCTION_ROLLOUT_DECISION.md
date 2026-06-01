# Bed Transfer Production Rollout Decision

## UI-Only Production Deploy Addendum

Date: 2026-06-01

Decision: `UI_ONLY_DEPLOYED_REAL_WRITE_BLOCKED`

| Question | Decision |
|---|---|
| Was employee Bed Transfer UI deployed? | Yes, UI-only to Worker version `5b17b7f2-0551-4cdb-a439-38fcc965b1cb`. |
| Was production schema ready for real write? | No. `bed_transfer_events` returned no production columns. |
| Is production schema migration required before real write? | Yes. `PRODUCTION_SCHEMA_MIGRATION_REQUIRED_BEFORE_REAL_WRITE`. |
| Is Bed Transfer save/export enabled? | No. UI displays approval-required copy and blocks TF draft save/export. |
| Was production D1 written? | No. |
| Was production migration executed? | No. |
| Production cutover | `PRODUCTION_NO_GO` |

Evidence:

- `BED_TRANSFER_PRODUCTION_SCHEMA_LIVE_READINESS_CHECK.md`
- `BED_TRANSFER_PRODUCTION_UI_ONLY_PREDEPLOY_VERIFY_RESULT.md`
- `BED_TRANSFER_PRODUCTION_UI_ONLY_DEPLOY_RESULT.md`
- `BED_TRANSFER_PRODUCTION_UI_ONLY_LIVE_SMOKE_RESULT.md`

Date: 2026-06-01
Decision: `STAGING_E2E_PASS_PRODUCTION_REQUIRES_SEPARATE_APPROVAL`

## Basis

The staging-only Bed Transfer E2E passed after applying `migrations/005_bed_transfer_events.sql` to `homelink-finance-staging`.

The E2E verified:

- from_bed to to_bed event persistence
- customer anchor preservation
- deposit carry-over as liability, not revenue
- arrears carry-over preservation
- TTLock old ref preservation
- new TTLock review-required state
- audit and trace linkage
- statistics anchors
- owner/backend visibility
- QA rollback to zero QA event/audit rows

## Production Decision

| Question | Decision |
|---|---|
| Recommend production UI-only deploy? | Eligible for separate approval, but not performed here. |
| Need production schema migration? | Yes, before any production Bed Transfer write smoke. Requires separate approval. |
| Can production smoke enter approval? | Yes, staging E2E evidence is now sufficient to prepare a separate approval packet. |
| Recommended production smoke scope | One low-risk bed transfer only. |
| Enable all employees immediately? | No. Do not enable broad usage before one production smoke and manual sign-off. |
| Production cutover | `PRODUCTION_NO_GO` |

## Disallowed In This Task

- Production write.
- Production write gate opening.
- Production migration.
- Production deploy.
- Automatic real bed relationship updates in production.
- Financial formula changes.
- Dashboard calculation changes.

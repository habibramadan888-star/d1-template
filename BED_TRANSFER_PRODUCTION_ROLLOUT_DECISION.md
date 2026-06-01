# Bed Transfer Production Rollout Decision

## Production Schema And Event Smoke Addendum

Date: 2026-06-01

Decision: `EVENT_LEDGER_SMOKE_PASS_BROAD_WRITE_BLOCKED`

| Question | Decision |
|---|---|
| Was production schema migration executed? | Yes, `migrations/005_bed_transfer_events.sql`. |
| Was the approved one-row smoke executed? | Yes, `144 -> 122`. |
| Was the smoke an occupancy mutation? | No, event-ledger only. |
| Was audit/trace evidence written? | Yes, one audit row and one trace row. |
| Was deposit/arrears/TTLock state mutated? | No. |
| Was broad internal employee UI write enabled? | No. |
| Why not enabled? | Current employee UI is gated and lacks a safe backend adapter to `bed_transfer_events`. |
| Production cutover | `PRODUCTION_NO_GO` |

Evidence:

- `BED_TRANSFER_PRODUCTION_SCHEMA_PREFLIGHT.md`
- `BED_TRANSFER_PRODUCTION_SCHEMA_MIGRATION_RESULT.md`
- `BED_TRANSFER_PRODUCTION_PRE_SMOKE_SNAPSHOT.md`
- `BED_TRANSFER_PRODUCTION_SMOKE_SAVE_RESULT.md`
- `BED_TRANSFER_PRODUCTION_ACCOUNTING_VERIFY.md`
- `BED_TRANSFER_PRODUCTION_TTLOCK_TRACE_VERIFY.md`
- `BED_TRANSFER_PRODUCTION_STATS_VERIFY.md`
- `BED_TRANSFER_PRODUCTION_OWNER_VISIBILITY_RESULT.md`
- `BED_TRANSFER_INTERNAL_TEST_ENABLEMENT_RESULT.md`
- `BED_TRANSFER_PRODUCTION_SMOKE_FINAL_RESULT.md`

## Live Render Path Fix Addendum

Date: 2026-06-01

Decision: `LIVE_UI_RENDER_PATH_FIXED_REAL_WRITE_BLOCKED`

| Question | Decision |
|---|---|
| Was the live Bed Transfer render path fixed? | Yes. Step 2 now mounts the dedicated Bed Transfer form. |
| Does Bed Transfer show From Bed / To Bed? | Yes. |
| Does Bed Transfer show Transfer Date / Reason / Note? | Yes. |
| Does Step 3 show Bed Transfer-specific context? | Yes. |
| Is real production write enabled? | No. Save/export remains gated. |
| Was production D1 written? | No. |
| Was production migration executed? | No. |
| Production cutover | `PRODUCTION_NO_GO` |

Evidence:

- `BED_TRANSFER_LIVE_RENDER_PATH_AUDIT.md`
- `BED_TRANSFER_EVENT_SELECTION_FIX_RESULT.md`
- `BED_TRANSFER_STEP2_FORM_FIX_RESULT.md`
- `BED_TRANSFER_STEP3_CONTEXT_FIX_RESULT.md`
- `BED_TRANSFER_SAVE_GATED_UI_RESULT.md`
- `BED_TRANSFER_LIVE_UI_RENDER_FIX_DEPLOY_RESULT.md`
- `BED_TRANSFER_LIVE_UI_RENDER_FIX_SMOKE_RESULT.md`

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

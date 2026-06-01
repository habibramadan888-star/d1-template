# Bed Transfer Production Rollout Decision

Date: 2026-06-01
Decision: `DO_NOT_ENABLE_PRODUCTION_YET`

## Basis

The staging E2E did not pass. It stopped at schema preflight because staging does not have `bed_transfer_events` or equivalent fields for transfer date, original occupancy anchors, deposit carry-over, arrears carry-over, TTLock old/new refs, audit linkage, and traceability linkage.

## Production Decision

| Question | Decision |
|---|---|
| Recommend production UI-only deploy? | No, not until staging schema/E2E is unblocked. |
| Need production schema migration? | Likely yes later, but not approved here. Validate in staging first. |
| Need production smoke? | Yes later, after staging E2E passes and separate approval is granted. |
| Recommended production smoke scope | One low-risk bed transfer only. |
| Enable all employees? | No. Do not enable before staging E2E passes. |
| Production cutover | `PRODUCTION_NO_GO` |

## Allowed Later Scope, If Separately Approved

- Staging schema migration for bed-transfer event persistence.
- Staging fixture setup and rollback.
- One staging Bed Transfer E2E.
- Later production migration/smoke only after a separate approval packet.

## Disallowed In This Task

- Production write.
- Production write gate opening.
- Production migration.
- Production deploy.
- Automatic real bed relationship updates.
- Financial formula changes.
- Dashboard calculation changes.

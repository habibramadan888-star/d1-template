# Ramadan Tenant Mapping Review Checklist

Date: 2026-05-27, Asia/Dubai

Owner: Ramadan Habib

Scope: manual review checklist only. This file does not approve production.

| Item | Question for Ramadan                                                                     | Evidence File                                                                                            | If Approved Means                                                               | If Not Approved Means                                                        | Suggested Status        |
| ---: | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------- |
|    1 | Do you accept `tenant_id` / `company_id` as the future SaaS isolation authority?         | `TENANT_SCOPE_AUTH_CLAIM_CONTRACT.md`; `TENANCY_MIGRATION_PLAN.md`                                       | Codex may prepare later preflight docs around server-side tenant authority.     | Keep production tenant authority blocked and revise the tenant model.        | NEEDS_BUSINESS_DECISION |
|    2 | Do you accept `corp_id` / `CORPID` only as legacy fallback, not final authority?         | `TENANCY_SCOPE_AUDIT.md`; `P0_006S_TENANT_SCOPE_PRODUCTION_APPROVAL_PACKET.md`                           | Legacy fallback can remain warning-only during approved migration/rollback.     | Production cannot move forward until fallback policy is redefined.           | NEEDS_BUSINESS_DECISION |
|    3 | Do you accept employees being limited to `allowed_property_ids`?                         | `TENANT_SCOPE_ACCESS_MATRIX_REHEARSAL_RESULT.md`; `TENANT_SCOPE_AUTH_CLAIM_CONTRACT.md`                  | Future employee routes can be reviewed against property membership.             | Employee entry/handover production scope remains blocked.                    | NEEDS_BUSINESS_DECISION |
|    4 | Do you accept owner visibility across the reviewed tenant/property set?                  | `TENANT_SCOPE_ACCESS_MATRIX.md`; `TENANT_CLAIM_TO_ROUTE_QUERY_WIRING_MATRIX.md`                          | Owner dashboard/history can proceed to later production preflight review.       | Owner visibility must be redesigned before production.                       | NEEDS_BUSINESS_DECISION |
|    5 | Do you accept manager/admin access constrained by tenant/property claims?                | `TENANT_SCOPE_ACCESS_MATRIX_REHEARSAL_RESULT.md`; `RAMADAN_TENANT_PROPERTY_MAPPING_DECISION_SHEET.md`    | Manager/admin production rules can be prepared for explicit preflight.          | Admin/manager policy remains a production blocker.                           | NEEDS_BUSINESS_DECISION |
|    6 | Do you accept current staging backfill mapping as production preflight input only?       | `P0_006I2_POST_BACKFILL_DRY_RUN_RESULT.md`; `P0_006I_EXACT_STAGING_BACKFILL_UPDATE_PLAN_V2.md`           | Staging evidence can be used as review input, not as production write approval. | More staging data review is required before production preflight.            | NEEDS_DATA_REVIEW       |
|    7 | Do you accept audit_logs / entry_events tenant scope evidence for review?                | `TENANT_SCOPE_ACCESS_MATRIX_COVERAGE_GAPS.md`; P0-006Q2 evidence files                                   | Audit/event scope can move to production visibility policy review.              | Additional audit/event evidence or remediation is needed.                    | NEEDS_DATA_REVIEW       |
|    8 | Do you accept production-copy dry-run evidence as input before production decisions?     | `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_MAPPING_MATRIX.md`; production-copy rollback/reconciliation evidence | Copy evidence can inform approval, but production still needs explicit signoff. | More copy dry-run or reconciliation work is required.                        | NEEDS_DATA_REVIEW       |
|    9 | Do you still require every production migration/backfill action to be manually approved? | `P0_006S_TENANT_SCOPE_PRODUCTION_APPROVAL_PACKET.md`; `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`            | No production migration/backfill can run without later explicit approval flags. | Production process must stop until a different approval workflow is defined. | NEEDS_BUSINESS_DECISION |

## Review Boundary

Approving a checklist item would approve only the documented review position for
a later preflight. It would not approve production deploy, production migration,
production D1 write, feature flags, or cutover.

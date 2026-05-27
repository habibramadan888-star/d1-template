# Commercial Launch Review 014 Starting Context

Date: 2026-05-27, Asia/Dubai

Scope: tenant/property mapping signoff support only. No production deploy,
staging deploy, production migration, remote production D1 migration,
production D1 write, staging D1 write, production-copy D1 write, D1
export/import/execute, production URL call, production config change, feature
flag change, business code change, dashboard change, or financial formula
change is approved or executed by this review.

## Current Production Blocker

Tenant/property mapping remains a production blocker because current live scope
still depends on legacy deployment-level `CORPID` compatibility, while final
SaaS isolation must use server-side tenant/company, property, role, employee,
owner, and membership claims. Production cannot proceed until Ramadan Habib
reviews and approves final tenant/property mapping, legacy fallback policy,
production backfill boundaries, rollback behavior, and route/query enforcement.

## Existing Staging Evidence

- `TENANCY_SCOPE_AUDIT.md` confirms static `CORPID` is not a SaaS tenant
  boundary.
- `TENANCY_MIGRATION_PLAN.md` defines future company/property/user/membership
  scope.
- `TENANT_SCOPE_COMPATIBILITY_COLUMN_MATRIX.md` identifies compatibility fields
  and tables needing manual approval.
- P0-006I/I2 staging backfill evidence shows compatibility-column dry-runs and
  selected staging writes, while manual-required rows remain.
- `TENANT_SCOPE_ACCESS_MATRIX_REHEARSAL_RESULT.md` passed for cross-tenant and
  cross-property denial in staging/local rehearsal.
- P0-006Q2 closed audit/event evidence gaps with staging-only QA rows.
- `TENANT_SCOPE_AUTH_CLAIM_CONTRACT.md` states `tenant_id` is future authority,
  `corp_id` is fallback only, frontend tenant input is ignored, and missing
  production tenant claim must block scoped access.

## Existing Production-Copy Evidence

- `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_MAPPING_MATRIX.md` lists candidate rows
  for production-copy dry-run review, including tenant scope rows for
  `sessions`, `transactions`, `active_sessions`, `employee_users`,
  `app_settings`, `arrears`, `arrear_tasks`, `audit_logs`, and `entry_events`.
- All production-copy row-level mapping rows remain `MANUAL_REQUIRED`; the copy
  evidence is review material, not production authorization.
- Production-copy rollback evidence is useful but still `PASS_WITH_WARNINGS`,
  so production rollback remains approval-gated.

## Mapping That Needs Ramadan Confirmation

- Whether `tenant_id` / `company_id` is accepted as future SaaS tenant
  authority.
- Whether `property_id` / room / unit mapping is accepted for production
  preflight.
- Whether `owner_id` and `employee_id` are sufficient actor identity anchors.
- Whether legacy `corp_id` / `CORPID` remains warning-only fallback.
- Whether production copy candidate row counts are acceptable inputs for a
  future production preflight.
- Whether audit/event scope evidence is sufficient for production review.
- Whether dashboard/history tenant filtering can proceed to later preflight
  without live switch.

## Mapping That Cannot Be Auto-Approved

- Production D1 target, backup, migration, backfill, and rollback.
- Final SaaS tenant/property mapping for production rows.
- Legacy CORPID fallback retirement or narrowing.
- Auth/session production switch.
- Route/query production switch.
- Dashboard/history production authority.
- Any row-level production UPDATE, INSERT, DELETE, or migration.

## Production NO-GO Reason

Production remains `PRODUCTION_NO_GO` because tenant/property final SaaS mapping,
legacy fallback policy, production row counts, production SQL, production
backup/rollback, and runtime switch approvals are still missing. This review
only prepares Ramadan-readable mapping decisions; it does not approve
production.

# P0-006Q Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: tenant scope audit/event rehearsal for `audit_logs` and `entry_events`.
No production deploy, production migration, production D1 write, production URL
call, staging D1 write, dashboard mutation, live financial formula change, or
secret exposure occurred.

## What P0-006P Proved

- The broader tenant access matrix passed in staging/local scope.
- Cross-tenant and cross-property access are denied in deterministic access
  matrix scenarios.
- Frontend `tenant_id` tampering is ignored.
- Legacy `CORPID` fallback remains warning-only.
- `audit_logs` and `entry_events` remained documented-only /
  `MANUAL_REQUIRED`.

## Why Audit Logs / Entry Events Were Manual Required

The access matrix proved role/resource policy behavior, but not enough
audit/event-specific staging evidence existed to prove every required write-path
attribution:

- `audit_logs` needed owner-created and void/delete evidence.
- `entry_events` needed scoped void event evidence.
- Existing staging rows include some scoped employee entry and handover evidence,
  but not all required audit/event lifecycle cases.

## Staging Schema Read-Only Confirmation

Target D1: `homelink-finance-staging`

Target D1 ID: `4ff78bfc-3855-436b-aefb-6b492145d79c`

Read-only command class used:

- `npx wrangler d1 info homelink-finance-staging`
- `npx wrangler d1 execute homelink-finance-staging --remote --json --command "<read-only SQL>"`

## Current Scope Fields

| Table          | Scope Fields Present                                                               | Notes                                                                                               |
| -------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `audit_logs`   | `corpid`, `userid`, `role`, `company_id`, `property_id`, `owner_id`, `employee_id` | `company_id` is the tenant compatibility field; `owner_id` exists but has no scoped owner rows yet. |
| `entry_events` | `corpid`, `userid`, `operator_id`, `company_id`, `property_id`, `employee_id`      | No `owner_id` field; owner visibility should be tenant/property query scoped.                       |

## Read-Only Staging Counts

| Table          | Total Rows | Company Scoped | Property Scoped | Employee Scoped | Owner Scoped | Legacy CORPID |
| -------------- | ---------: | -------------: | --------------: | --------------: | -----------: | ------------: |
| `audit_logs`   |          7 |              3 |               3 |               3 |            0 |             7 |
| `entry_events` |          5 |              3 |               3 |               3 |          n/a |             5 |

## Can Safely Auto-Verify

- Schema compatibility columns exist for both tables.
- Some employee entry audit/event rows have tenant/property/employee scope.
- Some handover audit/event rows have tenant/property/employee scope.
- Deterministic access-policy fixtures verify tenant/property filtering and
  denial behavior.

## Still Needs Staging Evidence Data

- Owner-created audit row with `owner_id` scope.
- Scoped `session.void` audit row.
- Scoped `session_void` entry event row.

## Minimum Safe Scope

P0-006Q remains read-only plus deterministic policy testing. It must not create
staging evidence rows without a separate explicit approval prompt with backup
and rollback.

## Production NO-GO

Production remains `NO-GO` because P0-006 is still Partial, production
tenant/auth authority is not live, production migration/backfill is not
approved, and audit/event evidence data is incomplete.

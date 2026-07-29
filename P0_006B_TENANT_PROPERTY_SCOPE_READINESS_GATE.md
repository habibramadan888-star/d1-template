# P0-006B Tenant / Property Scope Readiness Gate

Generated: 2026-05-25T03:42:25+04:00

Scope: readiness gate for implementing SaaS tenant/property scope. This gate does not rewrite auth, modify schema, change login behavior, or migrate data.

## Current Scope Position

| Area                          | Current Scope                             | Readiness      | Required Future Scope                                           |
| ----------------------------- | ----------------------------------------- | -------------- | --------------------------------------------------------------- |
| Owner login                   | Role plus deployment-wide `corpid`        | Not SaaS-ready | User membership resolved to `company_id` and allowed properties |
| Employee login                | Employee id plus deployment-wide `corpid` | Not SaaS-ready | Employee membership scoped by company/property                  |
| Active sessions               | `sid`, role, `userid`, `corpid`           | Partial        | Session claims or lookup must include company/property scopes   |
| `sessions`                    | `corpid`, no reliable `property_id`       | Not ready      | `company_id`, `property_id`, operator, void metadata            |
| `transactions`                | `corpid`, `userid`, session ids           | Not ready      | `company_id`, `property_id`, operator, idempotency              |
| `deposit_ledger`              | `corpid` and card/tenant fields           | Not ready      | company/property/card scope and transaction linkage             |
| `arrear_tasks`                | `corpid`, bed and tenant snapshots        | Not ready      | company/property/receivable/assignee scope                      |
| `audit_logs` / `entry_events` | `corpid`, `userid`                        | Partial        | company/property/actor/target immutable audit scope             |
| `app_settings`                | `corpid` JSON blobs                       | Not ready      | company and property settings split                             |
| Rate limits                   | deployment/user level                     | Partial        | login type plus company/user context where possible             |

## API Guard Readiness

| API Area                  | Current Risk                                                    | Minimum Future Gate                                            |
| ------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| Owner dashboard/history   | Manager role plus `corpid` filters, no company/property proof   | Owner can access only company/property memberships             |
| Employee entry            | Role guard exists, property membership not final                | Entry must resolve bed/property and reject out-of-scope writes |
| Handover staging endpoint | Request includes property scope but not production tenant model | Keep staging/local until tenant model is approved              |
| delete_session            | Owner route voids scoped by legacy `corpid`                     | Add company/property ownership checks before SaaS              |
| Rent config/settings      | Shared `app_settings` by `corpid`                               | Split or scope by property with effective dates                |
| Export/report APIs        | Owner role and legacy filters                                   | Export only authorized company/property data                   |

## Implementation Readiness

| Requirement                      | Status                                 | Gate Result       |
| -------------------------------- | -------------------------------------- | ----------------- |
| Target company/property model    | Planned                                | MANUAL_REQUIRED   |
| Migration draft                  | Partial via commercial bootstrap draft | MANUAL_REQUIRED   |
| Cross-tenant automated tests     | Planned only                           | MANUAL_REQUIRED   |
| Production-safe auth behavior    | Current role smoke exists              | Partial           |
| Backfill legacy rows to property | Not started                            | BLOCKS_PRODUCTION |
| Human tenant model decision      | Missing                                | MANUAL_REQUIRED   |

## Gate Conclusion

P0-006 status: `Partial - tenant/property scope readiness gate ready`.

GO for local/staging tenant-scope rehearsal: yes, if it uses isolated fixtures and does not modify production auth.

NO-GO for production SaaS multi-tenant launch: yes.

Production remains blocked until company/property model, memberships, migrations, backfill reconciliation, and cross-tenant denial tests are complete.

# Audit Logs / Entry Events Scope Matrix

Date: 2026-05-26, Asia/Dubai

Scope: staging/local audit/event scope matrix. No production deploy, production
migration, production D1 write, staging D1 write, dashboard mutation, live
financial formula change, or secret exposure occurred.

| Table          | Scope Fields                                         | Event Source                | Required Claim                      | Expected Access               | Current Coverage                              | Risk                                                                    |
| -------------- | ---------------------------------------------------- | --------------------------- | ----------------------------------- | ----------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| `audit_logs`   | `company_id`, `property_id`, `employee_id`, `corpid` | employee-created event      | employee tenant/property claim      | ALLOW for own event           | PASS, scoped employee entry rows exist        | Legacy rows without scope remain warnings.                              |
| `audit_logs`   | `company_id`, `property_id`, `owner_id`, `corpid`    | owner-visible event         | owner tenant claim                  | ALLOW for own tenant          | NEEDS_STAGING_EVIDENCE_DATA                   | No owner_id-scoped audit row exists.                                    |
| `audit_logs`   | `company_id`, `property_id`, `corpid`                | manager/admin-visible event | manager/admin tenant/property claim | ALLOW for allowed property    | PASS by deterministic policy fixture          | Needs live route evidence before production.                            |
| `audit_logs`   | `company_id`, `property_id`, `corpid`                | cross-tenant query          | any authenticated claim             | FILTER_OUT / DENY_403         | PASS by deterministic policy fixture          | Needs real cross-tenant staging rows before production.                 |
| `audit_logs`   | `company_id`, `property_id`, `corpid`                | cross-property query        | constrained claim                   | FILTER_OUT / DENY_403         | PASS by deterministic policy fixture          | Needs live route evidence before production.                            |
| `audit_logs`   | `company_id`, `property_id`, `owner_id`, `corpid`    | void/delete_session event   | owner/manager/admin scoped claim    | ALLOW for own tenant/property | NEEDS_STAGING_EVIDENCE_DATA                   | No scoped `session.void` audit row exists.                              |
| `audit_logs`   | `company_id`, `property_id`, `employee_id`, `corpid` | employee entry event        | employee scoped claim               | ALLOW for own event           | PASS, 2 scoped of 4 employee entry audit rows | Unscoped legacy rows remain warning-only.                               |
| `audit_logs`   | `company_id`, `property_id`, `employee_id`, `corpid` | handover event              | employee scoped claim               | ALLOW for own event           | PASS, 1 scoped of 3 handover audit rows       | Unscoped rejected/tamper audit rows need later review.                  |
| `entry_events` | `company_id`, `property_id`, `employee_id`, `corpid` | employee entry event        | employee scoped claim               | ALLOW for own event           | PASS, 1 scoped of 3 employee entry event rows | Unscoped legacy rows remain warning-only.                               |
| `entry_events` | `company_id`, `property_id`, `employee_id`, `corpid` | handover event              | employee scoped claim               | ALLOW for own event           | PASS, 1 scoped of 1 handover event rows       | Staging handover accepted event is scoped.                              |
| `entry_events` | `company_id`, `property_id`, `employee_id`, `corpid` | void event                  | owner/manager/admin scoped claim    | ALLOW for own tenant/property | NEEDS_STAGING_EVIDENCE_DATA                   | No scoped `session_void` entry event exists.                            |
| `entry_events` | `company_id`, `property_id`, `employee_id`, `corpid` | tenant scoped event         | tenant claim                        | ALLOW / FILTER_OUT            | PASS by deterministic policy fixture          | Needs more live rows before production.                                 |
| `entry_events` | `company_id`, `property_id`, `employee_id`, `corpid` | property scoped event       | allowed property claim              | ALLOW / FILTER_OUT            | PASS by deterministic policy fixture          | Needs more live rows before production.                                 |
| `entry_events` | `company_id`, `property_id`, `employee_id`, `corpid` | employee scoped event       | employee claim                      | ALLOW for own employee id     | PASS by deterministic policy fixture          | Needs production write-path decision later.                             |
| `entry_events` | `company_id`, `property_id`, `corpid`                | owner scoped visibility     | owner tenant claim                  | ALLOW for own tenant          | PASS by deterministic policy fixture          | No owner_id column by design; visibility must query by tenant/property. |
| `entry_events` | `company_id`, `property_id`, `corpid`                | cross-tenant query          | any authenticated claim             | FILTER_OUT / DENY_403         | PASS by deterministic policy fixture          | Needs real cross-tenant staging rows before production.                 |
| `entry_events` | `company_id`, `property_id`, `corpid`                | cross-property query        | constrained claim                   | FILTER_OUT / DENY_403         | PASS by deterministic policy fixture          | Needs live route evidence before production.                            |

## Conclusion

Audit/event schema and partial scoped staging rows are present, but P0-006Q
cannot close both coverage gaps without new staging-only evidence rows for
owner-created audit and void/session events.

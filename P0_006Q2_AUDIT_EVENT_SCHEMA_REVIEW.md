# P0-006Q2 Audit / Entry Event Schema Review

Date: 2026-05-26, Asia/Dubai

Target D1: `homelink-finance-staging`

## Schema Summary

| Table          | Scope Fields Present                                             | Writable QA Evidence Fields                                                                                                                                                 | Legacy Fields Preserved                      | Result |
| -------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------ |
| `audit_logs`   | `company_id`, `property_id`, `owner_id`, `employee_id`, `corpid` | `id`, `userid`, `role`, `action`, `target`, `detail`, `company_id`, `property_id`, `owner_id`, `employee_id`, `corpid`                                                      | `corpid` remains compatibility-only fallback | PASS   |
| `entry_events` | `company_id`, `property_id`, `employee_id`, `corpid`             | `event_id`, `userid`, `ref_id`, `ref_type`, `event_type`, `field_name`, `old_value`, `new_value`, `operator_id`, `ts`, `company_id`, `property_id`, `employee_id`, `corpid` | `corpid` remains compatibility-only fallback | PASS   |

## Required Answers

1. `audit_logs` has scope fields: `company_id`, `property_id`, `owner_id`, `employee_id`, and legacy `corpid`.
2. `entry_events` has scope fields: `company_id`, `property_id`, `employee_id`, and legacy `corpid`; it does not have `owner_id`.
3. Writable QA evidence fields are the existing nullable/text fields listed above.
4. Legacy `corpid` must be preserved and treated as warning-only compatibility, not SaaS authority.
5. Minimum QA evidence row fields are deterministic row id, scope fields, event/action type, user/operator id, source marker, and `qa_run_id`.
6. Event types to cover are owner-created audit, employee-created audit, void/session audit, employee entry event, handover event, session void event, tenant-scoped event, property-scoped event, employee-scoped event, and negative cross-scope evidence.
7. `entry_events.owner_id` cannot be inferred because the column does not exist; owner visibility must be verified through tenant/property scope.
8. It is safe to write QA evidence rows because the approved write is limited to `audit_logs` and `entry_events`, uses deterministic IDs and `qa_run_id`, and does not write business tables or production.

Production remains `NO-GO`.

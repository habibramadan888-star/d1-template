# Arrears Directive Production Write Gate Plan

Date: 2026-05-31

## Gate

| Item                    | Plan                                                                           |
| ----------------------- | ------------------------------------------------------------------------------ |
| Gate name               | `ARREARS_DIRECTIVE_WRITE_APPROVED`                                             |
| Alternate accepted mode | `ARREARS_DIRECTIVE_WRITE_MODE=approved`                                        |
| Default                 | Closed / absent                                                                |
| Enablement method       | Temporary production secret or variable change after explicit Ramadan approval |
| Disablement method      | Delete production secret or set mode away from `approved`                      |
| Current task status     | Not enabled                                                                    |

## Enablement Conditions

The production write gate may only be enabled when all are true:

1. Production schema migration is explicitly approved.
2. Production minimum smoke write is explicitly approved.
3. Rollback/cleanup plan is explicitly approved.
4. Operator confirms production cutover remains `PRODUCTION_NO_GO`.
5. Operator confirms no dashboard/financial formula changes are included.

## Allowed API Scope Under Gate

| API                                             | Method | Allowed Purpose                                                               |
| ----------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `/api/boss/arrears/directives`                  | `POST` | Owner/manager creates directive for approved task ids                         |
| `/api/employee/arrears/directives`              | `GET`  | Assigned employee reads directives; read-only and does not require write gate |
| `/api/employee/arrears/directives/:id/followup` | `POST` | Assigned employee submits `promised_payment_date` and `followup_note` only    |

## Forbidden API / Actions

- Any production D1 export/import during smoke.
- Bulk real customer updates.
- Handover submit.
- Employee entry write.
- Void/delete session.
- Close/write-off arrears through this approval.
- Dashboard calculation change.
- Financial formula change.
- Tenant-scope bypass.
- readonly_admin write.
- Employee updating another employee's directive.
- Owner bypassing idempotency/audit.

## Role Rules

| Role                | Permission                                                    |
| ------------------- | ------------------------------------------------------------- |
| owner/manager/admin | May create approved directive writes through idempotent API   |
| employee/staff      | May read own assigned directives and write own follow-up only |
| readonly_admin      | Read-only; write remains 403                                  |

## Required Runtime Guarantees

- Every write must include idempotency key.
- Same idempotency key and same payload must replay.
- Same idempotency key and different payload/actor must conflict.
- Audit must record owner directive and employee follow-up.
- Gate must be disabled immediately after the approved smoke.

## Current Status

Production write gate enabled: `No`.

# P0-001H Employee Entry Adapter Route Harness

Date: 2026-05-24

Scope: local/staging-only route harness for employee entry live-write adapter rehearsal.

## Endpoint

| Item                | Value                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Method              | `POST`                                                                                    |
| Path                | `/api/staging/employee-entry/adapter-draft`                                               |
| Production behavior | `404 NOT_FOUND`                                                                           |
| Feature flag        | `ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING=true`                                              |
| Allowed APP_ENV     | `development`, `dev`, `local`, `test`, `staging`                                          |
| Auth                | Required server-side JWT/session auth                                                     |
| Allowed roles       | `staff`, `employee`                                                                       |
| Rejected roles      | `manager`, `owner`, `admin`, unauthenticated                                              |
| Live write behavior | No database writes                                                                        |
| Legacy live tables  | Does not write `sessions`, `transactions`, `deposit_ledger`, `arrears`, or `arrear_tasks` |

## Implemented Behavior

The route builds a draft request for `createEmployeeEntryLiveWriteAdapterDraft` using the authenticated employee context, request `session`, request `entry`, resolved anchors, and caller-provided ids.

The route returns:

- `adapter_draft.transactionPlan`
- `adapter_draft.sessionPlan`
- `adapter_draft.depositLedgerPlan`
- `adapter_draft.arrearTaskPlan`
- `adapter_draft.auditPlan`
- route metadata proving `writesDatabase=false`

## Guardrails

- Production environment is disabled before auth and returns `404`.
- Local/staging environment still requires `ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING=true`.
- Unauthenticated and bad JWT requests return `401`.
- Owner/manager submit attempts return `403`.
- Invalid money, including three decimal places, returns rejected adapter status.
- Voided rows return `SKIPPED_VOIDED` and do not produce live write plans.
- The endpoint is not wired to `/api/employee/entry`.
- The endpoint does not change dashboard/history output.

## Verification Scope

Automated coverage is provided by:

- `npm run test:employee-entry-adapter-staging-endpoint`
- `npm run rehearse:employee-entry-adapter-staging-endpoint`

This task does not approve production migration, production deploy, live handover switching, or live employee entry switching.

## P0-001 Status

P0-001 remains:

`Partial - local/staging employee entry adapter route harness passed`

It cannot be marked Verified until a later approved task handles production migration, live write-path switching, reconciliation on production-copy data, and human review.

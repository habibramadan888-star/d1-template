# P0-001I Live Route Cutover Blueprint

Date: 2026-05-24

This blueprint defines a future local/staging-only cutover rehearsal. It does not authorize implementation in this task.

## Minimum Future Implementation Scope

| Item          | Rule                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------- |
| Route         | Existing `POST /api/employee/entry`                                                         |
| Environment   | `APP_ENV` must be `development`, `dev`, `local`, `test`, or `staging`                       |
| Feature flag  | `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true`                                             |
| Production    | Must continue using legacy behavior until separately approved                               |
| Auth          | Existing `requireAuth` remains mandatory                                                    |
| Role          | Employee/staff can submit; owner/manager behavior must remain controlled by existing policy |
| Adapter       | `createEmployeeEntryLiveWriteAdapterDraft` must run before any write                        |
| Money         | Adapter output must use integer-fils plans                                                  |
| Legacy writes | No production write changes in rehearsal task                                               |
| Dashboard     | Must remain unchanged unless a separate dashboard authority task approves it                |
| Audit         | Any real local/staging write must create `entry_events` and `audit_logs` evidence           |
| Rollback      | Feature flag off restores legacy behavior                                                   |

## Forbidden In Future Rehearsal

- No production deployment.
- No production D1 migration.
- No remote D1 migration.
- No deletion of legacy decimal/REAL fields.
- No dashboard live result switch.
- No handover live flow switch.
- No receivables production model landing.
- No tenant rewrite.
- No hard-coded secrets.
- No frontend totals as authority.

## Future Rehearsal Steps

1. Start clean local D1.
2. Run local migrations and dev seed.
3. Snapshot legacy live route output and legacy table writes.
4. Enable `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true` in local/staging only.
5. Submit representative employee entries.
6. Compare adapter plan against actual write result.
7. Confirm `*_fils` fields exist only where local/staging schema supports them.
8. Confirm dashboard/history snapshots are unchanged unless explicitly included.
9. Confirm audit/entry events exist.
10. Disable the feature flag and confirm legacy behavior is restored.

## Required Scenario Coverage

- Full rent, cash.
- Short-paid rent with arrears handling and promise date.
- Deposit collection.
- Deposit refund.
- Checkout deduction.
- Arrears payment.
- Transfer fee.
- Expense.
- Invalid three-decimal money.
- JS numeric money input.
- Voided row.
- Duplicate entry id.
- Employee unauthorized scope.
- Feature flag rollback.

## Exit Criteria

P0-001 can only move beyond Partial after a separate task proves local/staging live-route switch rehearsal, production-copy reconciliation, human accounting review, rollback readiness, and approved migration sequence.

# P0-006K Rollback Plan

Date: 2026-05-26, Asia/Dubai

Scope: rollback plan for a future tenant scope staging route/query wiring rehearsal.

## Feature Flags

| Flag                                                  | Purpose                                         | Rollback Value | Production |
| ----------------------------------------------------- | ----------------------------------------------- | -------------- | ---------- |
| `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING`       | Staging route enforcement rehearsal             | `false`        | disabled   |
| `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING` | Staging dashboard/history query scope rehearsal | `false`        | disabled   |

## Rollback Method

1. Set `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING=false`.
2. Set `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING=false`.
3. Re-run route gate and query gate in local/staging mode.
4. Verify `/api/employee/entry`, `/api/staging/handover/commit`, `/api/delete_session`, `/api/rent_config`, `/api/history`, and dashboard active totals return to legacy/disabled behavior expected by the rehearsal.
5. Re-run `npm run gate:commercial-launch`.
6. Confirm production remains `PRODUCTION_NO_GO`.

## Verification After Rollback

| Check                        | Expected           |
| ---------------------------- | ------------------ |
| Route enforcement flag       | `false`            |
| Dashboard/history query flag | `false`            |
| Production deploy            | no                 |
| Production migration         | no                 |
| Production D1 write          | no                 |
| Staging D1 backfill write    | no                 |
| Dashboard live mutation      | no                 |
| Legacy CORPID removal        | no                 |
| `gate:commercial-launch`     | `PRODUCTION_NO_GO` |

## Rollback Escalation

If a future staging wiring rehearsal mutates data unexpectedly or cannot disable the flags, stop immediately and do not submit success evidence. Use the latest staging backup and exact reverse plan from the relevant task before attempting cleanup.

This P0-006K task did not enable feature flags and did not require rollback execution.

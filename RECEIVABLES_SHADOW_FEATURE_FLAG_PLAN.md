# Receivables Shadow Feature Flag Plan

Generated: 2026-05-25, Asia/Dubai

Feature flag: `ENABLE_RECEIVABLES_SHADOW_STAGING`

| Env                    | Flag  | Expected Behavior                                                      |
| ---------------------- | ----- | ---------------------------------------------------------------------- |
| production             | true  | disabled; legacy behavior only                                         |
| production             | false | disabled; legacy behavior only                                         |
| staging                | false | legacy/no-shadow behavior                                              |
| staging                | true  | receivables shadow comparison allowed; dashboard live result unchanged |
| local/test/development | true  | receivables shadow comparison allowed for tests/rehearsal              |
| missing APP_ENV        | any   | production-safe disabled                                               |

Rules:

- Production is always disabled.
- Shadow mode is read-only and does not change dashboard live result.
- Frontend totals are never authority.
- Any future remote flag usage must rollback to `false` after QA.
- This task did not enable a remote feature flag.

Rollback:

```text
ENABLE_RECEIVABLES_SHADOW_STAGING=false
```

Validation after rollback:

- Shadow mode resolves to `LEGACY_NO_SHADOW`.
- Dashboard remains legacy/unchanged.
- `npm run gate:commercial-launch` remains `PRODUCTION_NO_GO`.

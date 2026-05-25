# Backend Totals Staging Feature Flag And Rollback Plan

Generated: 2026-05-25

Scope: future P0-003E staging switch rehearsal control plan. This plan is not a
production deploy plan and does not enable any feature flag by itself.

## Feature Flag

| Item                   | Value                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Feature flag name      | `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING`                                                       |
| Allowed APP_ENV values | `development`, `dev`, `local`, `test`, `staging`                                                |
| Production behavior    | Always disabled, even if flag is set accidentally                                               |
| Flag off behavior      | Current legacy dashboard / totals behavior                                                      |
| Flag on behavior       | Staging shadow response or explicitly scoped staging switch response depending on P0-003E scope |

## Rollback

Rollback command concept:

```text
Set ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING=false in staging.
```

Rollback requirements:

1. Production deploy remains forbidden.
2. Production migration remains forbidden.
3. Production feature flags remain untouched.
4. Dashboard returns legacy behavior after rollback.
5. `npm run gate:commercial-launch` remains `PRODUCTION_NO_GO`.
6. Any staging-only deployment needed to change staging vars must target only `homelink-finance-staging`.

## Validation After Rollback

| Check                        | Expected                                        |
| ---------------------------- | ----------------------------------------------- |
| Feature flag                 | `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING=false` |
| Dashboard response           | Legacy behavior                                 |
| Backend totals shadow report | Still runnable read-only                        |
| Production gate              | `PRODUCTION_NO_GO`                              |
| Secret safety                | no secret printed or committed                  |

## Production Boundary

This plan does not authorize:

- production deploy
- production migration
- production D1 writes
- production dashboard switch
- production feature flag enablement
- marking P0-003 as Verified

# Embedded Worker Runtime Probe Result

Scope: local-only P1-006B smoke using `deploy-worker/wrangler.embedded.toml`. This is not a deploy and does not use remote D1.

- Overall result: **PASS**

## Checks

| Scenario            | Check                                             | Expected   | Actual                                                                                                                       | Result |
| ------------------- | ------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| production disabled | /api/me unauthenticated                           | 401        | 401 {"error":"unauthenticated"}                                                                                              | PASS   |
| production disabled | staging handover production disabled              | 404        | 404 {"success":false,"code":"NOT_FOUND","error":"NOT_FOUND","message":"Endpoint not found."}                                 | PASS   |
| production disabled | delete_session route guarded                      | 401 or 403 | 401 {"error":"unauthenticated"}                                                                                              | PASS   |
| feature flag off    | staging handover feature disabled                 | 403        | 403 {"success":false,"code":"FEATURE_DISABLED","error":"FEATURE_DISABLED","message":"Handover atomic staging endpoint is dis | PASS   |
| feature flag on     | staging handover route reachable and auth guarded | 401        | 401 {"error":"unauthenticated"}                                                                                              | PASS   |

## Notes

- Production mode must return 404 for `/api/staging/handover/commit`.
- Staging/local with feature flag off must return 403 before auth.
- Staging/local with feature flag on must expose the route but still require auth.
- `/api/delete_session` is only probed as unauthenticated 401; no destructive delete is executed.

## Worker Logs

### production disabled

```text

 ⛅️ wrangler 4.94.0
───────────────────
Your Worker has access to the following bindings:
Binding                                                                    Resource                  Mode
env.RATE_LIMIT (c7c64d522d964baba2e72454e7262da9)                          KV Namespace              local
env.DB (homelink)                                                          D1 Database               local
env.APP_ENV ("production")                                                 Environment Variable      local
env.ENABLE_HANDOVER_ATOMIC_STAGING ("true")                                Environment Variable      local
env.APP_NAME ("Homelink Finance")                                          Environment Variable      local
env.APP_VERSION ("2.0.0")                                                  Environment Variable      local
env.CORPID ("homelink")                                                    Environment Variable      local

⎔ Starting local server...
[wrangler:info] Ready on http://127.0.0.1:8803
[wrangler:info] GET /api/me 401 Unauthorized (11ms)
[wrangler:info] GET /api/me 401 Unauthorized (7ms)
[wrangler:info] POST /api/staging/handover/commit 404 Not Found (6ms)
[wrangler:info] POST /api/delete_session 401 Unauthorized (4ms)

```

### feature flag off

```text

 ⛅️ wrangler 4.94.0
───────────────────
Your Worker has access to the following bindings:
Binding                                                                    Resource                  Mode
env.RATE_LIMIT (c7c64d522d964baba2e72454e7262da9)                          KV Namespace              local
env.DB (homelink)                                                          D1 Database               local
env.APP_ENV ("staging")                                                    Environment Variable      local
env.ENABLE_HANDOVER_ATOMIC_STAGING ("false")                               Environment Variable      local
env.APP_NAME ("Homelink Finance")                                          Environment Variable      local
env.APP_VERSION ("2.0.0")                                                  Environment Variable      local
env.CORPID ("homelink")                                                    Environment Variable      local

⎔ Starting local server...
[wrangler:info] Ready on http://127.0.0.1:8804
[wrangler:info] GET /api/me 401 Unauthorized (8ms)
[wrangler:info] POST /api/staging/handover/commit 403 Forbidden (5ms)

```

### feature flag on

```text

 ⛅️ wrangler 4.94.0
───────────────────
Your Worker has access to the following bindings:
Binding                                                                    Resource                  Mode
env.RATE_LIMIT (c7c64d522d964baba2e72454e7262da9)                          KV Namespace              local
env.DB (homelink)                                                          D1 Database               local
env.APP_ENV ("staging")                                                    Environment Variable      local
env.ENABLE_HANDOVER_ATOMIC_STAGING ("true")                                Environment Variable      local
env.APP_NAME ("Homelink Finance")                                          Environment Variable      local
env.APP_VERSION ("2.0.0")                                                  Environment Variable      local
env.CORPID ("homelink")                                                    Environment Variable      local

⎔ Starting local server...
[wrangler:info] Ready on http://127.0.0.1:8805
[wrangler:info] GET /api/me 401 Unauthorized (10ms)
[wrangler:info] POST /api/staging/handover/commit 401 Unauthorized (5ms)

```

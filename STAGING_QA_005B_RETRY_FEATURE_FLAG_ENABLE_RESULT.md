# STAGING-QA-005B Retry Feature Flag Enable Result

Generated: 2026-05-25

| Check                                | Result           | Evidence                                                                                    | Notes                                                                               |
| ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Flags enabled                        | yes              | `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true`; `ENABLE_HANDOVER_ATOMIC_STAGING=true`      | Values were applied only under `env.staging`.                                       |
| Environment                          | staging          | `npx wrangler deploy --env staging --config deploy-worker/wrangler.toml`                    | Explicit staging environment flag used.                                             |
| Target Worker                        | PASS             | `homelink-finance-staging`                                                                  | Wrangler output deployed `homelink-finance-staging`.                                |
| Production touched                   | no               | No production command was run.                                                              | No production deploy, migration, D1 write, or production flag change.               |
| Command used                         | PASS             | `npx wrangler deploy --env staging --config deploy-worker/wrangler.toml`                    | Staging-only config deploy was required because the approved flags are Worker vars. |
| Requires deploy                      | yes              | Worker vars are defined in Wrangler config.                                                 | Rollback must redeploy staging with both flags false.                               |
| Staging deploy executed              | yes              | Successful QA enablement used staging Worker version `4a8a78b4-048a-4635-a60f-52d1f63c115a` | This is not a production deploy.                                                    |
| Production deploy executed           | no               | No production deploy command run.                                                           | Production remains untouched.                                                       |
| Handover flag runtime probe          | PASS             | Unauthenticated `/api/staging/handover/commit` returned HTTP 401 after enablement.          | 401 indicates the request passed the feature gate and reached auth.                 |
| Employee entry live-route flag probe | PENDING_WRITE_QA | No safe non-write probe exists for `/api/employee/entry`.                                   | Real QA response must include `adapter_live_route_rehearsal.enabled=true`.          |

Note: An earlier enablement attempt reached version `e00b3a8c-89f5-4ad1-b0d1-d5f8a46087b9`, but QA was blocked before write by a Windows argument handling issue in the QA script D1 SELECT. Flags were rolled back before the successful retry. `/api/staging/employee-entry/adapter-draft` remained HTTP 403 because it is guarded by a separate staging-draft flag and is not the P0-001J live-route rehearsal path approved for this task.

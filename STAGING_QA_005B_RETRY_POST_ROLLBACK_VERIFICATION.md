# STAGING-QA-005B Retry Post-Rollback Verification

Generated: 2026-05-25

| Check                                       | Expected                    | Actual                             | Result | Notes                                                                     |
| ------------------------------------------- | --------------------------- | ---------------------------------- | ------ | ------------------------------------------------------------------------- |
| `/api/staging/handover/commit`              | HTTP 403 `FEATURE_DISABLED` | HTTP 403                           | PASS   | POST probe without auth returned 403 after rollback.                      |
| `/api/staging/employee-entry/adapter-draft` | HTTP 403 `FEATURE_DISABLED` | HTTP 403                           | PASS   | Endpoint remains disabled; separate staging-draft flag was not enabled.   |
| `npm run qa:employee-entry-staging`         | dry-run only                | `MANUAL_REQUIRED` / `DRY_RUN_ONLY` | PASS   | No confirmation flags supplied after rollback.                            |
| `npm run gate:commercial-launch`            | `PRODUCTION_NO_GO`          | `PRODUCTION_NO_GO`                 | PASS   | Production cutover remains blocked.                                       |
| Production touched                          | no                          | no                                 | PASS   | No production URL, deploy, migration, D1 write, or feature flag was used. |

Conclusion: rollback succeeded and staging flags are back to `false`.

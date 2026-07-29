# STAGING-QA-005B Retry Pre-Flag Confirmation

Generated: 2026-05-25

| Item                             | Expected                                                       | Actual                                                         | Result | Notes                                                                                   |
| -------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| Target Worker                    | `homelink-finance-staging`                                     | `homelink-finance-staging`                                     | PASS   | Confirmed from `deploy-worker/wrangler.toml` `[env.staging]`.                           |
| Target URL                       | `https://homelink-finance-staging.habibramadan888.workers.dev` | `https://homelink-finance-staging.habibramadan888.workers.dev` | PASS   | User confirmed this is non-production and has no production custom route.               |
| Target D1                        | `homelink-finance-staging`                                     | `homelink-finance-staging`                                     | PASS   | Confirmed by `npx wrangler d1 info homelink-finance-staging --json`.                    |
| Target D1 ID                     | `4ff78bfc-3855-436b-aefb-6b492145d79c`                         | `4ff78bfc-3855-436b-aefb-6b492145d79c`                         | PASS   | Confirmed by read-only D1 info.                                                         |
| Production URL excluded          | yes                                                            | yes                                                            | PASS   | Manual Cloudflare Dashboard confirmation was provided by the operator.                  |
| Backup exists                    | yes                                                            | yes                                                            | PASS   | `./backups/homelink-finance-staging-before-schema-bootstrap.sql` exists and is ignored. |
| Rollback method                  | set both feature flags false                                   | set both feature flags false                                   | PASS   | This retry must redeploy staging with both flags false after QA.                        |
| Commercial launch gate           | `PRODUCTION_NO_GO`                                             | `PRODUCTION_NO_GO`                                             | PASS   | Baseline `npm run gate:commercial-launch` passed.                                       |
| Baseline readiness timeout fixed | yes                                                            | yes                                                            | PASS   | `npm run test:employee-entry-adapter-staging-endpoint` and `npm run check` passed.      |

Safety statement:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production feature flags: unchanged.
- Staging write QA is allowed only after staging-only flags are enabled.

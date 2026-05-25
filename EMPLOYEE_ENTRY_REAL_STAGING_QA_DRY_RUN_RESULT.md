# Employee Entry Real Staging QA Dry-Run Result

Generated: 2026-05-25T12:21:53.441Z

Result: `MANUAL_REQUIRED`

| Check                     | Result       | Notes                                                        |
| ------------------------- | ------------ | ------------------------------------------------------------ |
| STAGING_WORKER_URL        | FOUND        | https://homelink-finance-staging.habibramadan888.workers.dev |
| STAGING_D1_DATABASE       | FOUND        | homelink-finance-staging                                     |
| STAGING_ENTRYPOINT        | FOUND        | src/index.js                                                 |
| STAGING_EMPLOYEE_USERNAME | FOUND        | value present, not printed                                   |
| STAGING_OWNER_USERNAME    | FOUND        | value present, not printed                                   |
| production URL guard      | PASS         | URL does not match blocked production patterns               |
| --confirm-staging-write   | MISSING      | required before any staging write                            |
| --confirm-backup          | MISSING      | required before any staging write                            |
| --confirm-rollback        | MISSING      | required before any staging write                            |
| write execution           | DRY_RUN_ONLY | no remote write attempted                                    |

This script does not deploy, migrate, or write staging data unless all explicit confirmations are supplied.

# Employee Entry Real Staging QA Dry-Run Result

Generated: 2026-05-24T23:44:02.434Z

Result: `MANUAL_REQUIRED`

| Check                     | Result          | Notes                             |
| ------------------------- | --------------- | --------------------------------- |
| STAGING_WORKER_URL        | MISSING         | manual staging input required     |
| STAGING_D1_DATABASE       | MISSING         | manual staging input required     |
| STAGING_ENTRYPOINT        | MISSING         | manual staging input required     |
| STAGING_EMPLOYEE_USERNAME | MISSING         | manual staging input required     |
| STAGING_OWNER_USERNAME    | MISSING         | manual staging input required     |
| production URL guard      | MANUAL_REQUIRED | no URL provided                   |
| --confirm-staging-write   | MISSING         | required before any staging write |
| --confirm-backup          | MISSING         | required before any staging write |
| --confirm-rollback        | MISSING         | required before any staging write |
| write execution           | DRY_RUN_ONLY    | no remote write attempted         |

This script does not deploy, migrate, or write staging data unless all explicit confirmations are supplied.

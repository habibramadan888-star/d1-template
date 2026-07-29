# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-021C Backup / Rollback Approval Blockers

Use only after REVIEW-021A is complete.

Target blockers:

- SO-002: production D1 backup approval.
- SO-003: production D1 restore / rollback approval.
- SO-020: rollback owner approval.

Goal: prepare backup and rollback approval packets only. This prompt does not
authorize production write, production export, restore/import, migration,
deploy, feature flags, or cutover.

Strict limits:

1. Do not execute production deploy.
2. Do not execute staging deploy.
3. Do not execute production migration.
4. Do not write production D1.
5. Do not write staging D1.
6. Do not write production-copy D1.
7. Do not execute D1 export/import/execute.
8. Do not call production URL.
9. Do not modify production config.
10. Do not enable production feature flags.
11. Do not mark commercial launch GO.
12. Keep production cutover `PRODUCTION_NO_GO`.

Required outputs:

1. Production backup approval packet for SO-002.
2. Restore / reverse-update rollback approval packet for SO-003.
3. Rollback owner and trigger criteria packet for SO-020.
4. Explicit statement that no production backup/export/restore/import/execute
   was run in this task.

Approval boundary:

This task may prepare approval documents only. Any future production backup,
restore rehearsal, production D1 write, production migration, production deploy,
or cutover requires a separate explicit Ramadan approval task.

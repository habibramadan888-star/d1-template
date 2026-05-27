# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-021C Backup Rollback Approval Blockers

Use after REVIEW-021 is complete.

Goal: prepare backup and rollback approval packets for SO-002, SO-003, and
SO-020. This prompt is for approval preparation only.

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

1. Production backup approval packet.
2. Restore/reverse-update rollback approval packet.
3. Rollback owner and trigger criteria packet.
4. Explicit statement that no production backup/export/restore/import/execute
   was run in this task.

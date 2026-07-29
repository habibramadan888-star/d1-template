# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-023 Final Preflight Signoff Packet

Use only after REVIEW-021 blocker reduction and any approved REVIEW-022
production-copy dry-run refresh are complete.

Goal: prepare a final production preflight signoff packet. This is still not
production execution approval.

Strict limits:

1. Do not execute production deploy.
2. Do not execute staging deploy.
3. Do not execute production migration.
4. Do not write production D1.
5. Do not write staging D1.
6. Do not execute D1 export/import/execute.
7. Do not enable production feature flags.
8. Do not mark commercial launch GO.
9. Do not mark Partial P0 items Verified.

Required packet:

1. Production D1 target confirmation requirement.
2. Production backup and restore approval requirement.
3. Final migration/backfill SQL approval requirement.
4. Final accounting and TOP_25 money risk decision summary.
5. Final tenant/property mapping decision summary.
6. Final receivables/accounting decision summary.
7. Feature flag and deploy approval boundaries.
8. Cutover and monitoring approval boundaries.
9. Explicit `PRODUCTION_NO_GO` unless a later task grants production execution
   approval.

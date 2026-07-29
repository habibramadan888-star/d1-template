# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-018 Production Preflight-Only Approval Packet

Use this prompt after REVIEW-017 applies Ramadan's item-by-item preflight
decisions.

## Goal

Prepare a production preflight-only approval packet. This packet must not
execute production writes, migration, deploy, feature flags, dashboard switch,
or cutover.

## Strictly Forbidden

1. Production deploy.
2. Staging deploy.
3. Production migration.
4. Remote production D1 migration.
5. Production D1 write.
6. Staging D1 write.
7. Production-copy D1 write.
8. D1 export/import/execute.
9. Production URL call.
10. Production config change.
11. Feature flag enablement.
12. Dashboard authority switch.
13. Commercial cutover.

## Required Packet Contents

1. Production D1 target confirmation checklist.
2. Fresh backup approval checklist.
3. Restore/rollback approval checklist.
4. Final production SQL review checklist.
5. Exact row-count and WHERE-clause checklist.
6. Money reconciliation preflight acceptance summary.
7. Tenant/property mapping preflight acceptance summary.
8. Receivables/accounting preflight acceptance summary.
9. Dashboard authority switch no-go statement.
10. Deploy/cutover no-go statement.

Production status must remain `PRODUCTION_NO_GO`.

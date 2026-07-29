# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-016 Review Remaining Production Preflight Signoffs

Use this prompt after Ramadan receivables/accounting decisions have been
applied.

## Scope

Documentation and signoff-gap review only.

Do not execute:

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
12. Business code change.
13. Dashboard change.
14. Financial formula change.

## Required Review

Read:

1. `COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md`
2. `COMMERCIAL_LAUNCH_MISSING_SIGNOFF_LIST.md`
3. `RECEIVABLES_ACCOUNTING_SIGNOFF_UPDATE_RESULT.md`
4. `RAMADAN_RECEIVABLES_ACCOUNTING_DECISION_SHEET.md`
5. `RAMADAN_TENANT_PROPERTY_MAPPING_DECISION_SHEET.md`
6. `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md`
7. `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`
8. `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`

## Required Output

Generate a remaining-signoff review packet showing:

1. Which signoffs are now ready for production preflight planning.
2. Which signoffs still require Ramadan decisions.
3. Which signoffs are still blocked by production backup, rollback, migration,
   deploy, feature flags, or cutover.
4. Why commercial launch remains `PRODUCTION_NO_GO`.

Production status must remain `PRODUCTION_NO_GO`.

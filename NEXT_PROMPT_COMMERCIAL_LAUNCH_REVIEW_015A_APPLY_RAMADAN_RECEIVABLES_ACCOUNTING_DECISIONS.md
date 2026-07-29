# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-015A Apply Ramadan Receivables Accounting Decisions

Use this prompt only after Ramadan Habib has filled or otherwise explicitly
provided item-by-item decisions for:

- `RAMADAN_RECEIVABLES_ACCOUNTING_DECISION_SHEET.md`
- `RAMADAN_RECEIVABLES_ACCOUNTING_REVIEW_CHECKLIST.md`

## Strict Scope

Only update documentation and signoff tracker status.

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

## Required Inputs

Ramadan must provide explicit decisions using only:

- `APPROVE`
- `KEEP_OPEN`
- `NEEDS_FIX`
- `NEEDS_ACCOUNTING_DECISION`
- `NOT_PRODUCTION_BLOCKING`
- `BLOCK_PRODUCTION`

## Required Rules

1. Do not automatically approve any item that Ramadan did not explicitly mark
   `APPROVE` or `NOT_PRODUCTION_BLOCKING`.
2. Keep SO-010 and SO-011 unapproved unless every production-blocking
   receivables/accounting decision is explicitly closed.
3. Keep production cutover `PRODUCTION_NO_GO` unless all independent production
   signoffs are complete.
4. Do not mark any Partial P0 as Verified.
5. Preserve separate approval categories even though Ramadan Habib is the
   unified owner.

## Required Outputs

Update:

1. `RAMADAN_RECEIVABLES_ACCOUNTING_DECISION_SHEET.md`
2. `RAMADAN_RECEIVABLES_ACCOUNTING_REVIEW_CHECKLIST.md`
3. `COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md`
4. `COMMERCIAL_LAUNCH_MISSING_SIGNOFF_LIST.md`
5. `RAMADAN_SIGNOFF_ACTION_LIST.md`
6. `COMMERCIAL_LAUNCH_READINESS_RESULT.md`
7. `COMMERCIAL_LAUNCH_READINESS_MATRIX.md`
8. `NEXT_MORNING_REVIEW.md`

Run:

```bash
npm run format:check
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run qa:employee-entry-staging
```

Expected gate result remains `PRODUCTION_NO_GO` unless every required signoff is
independently approved.

# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-013A Apply Ramadan Money Risk Decisions

Use this prompt only after Ramadan Habib has explicitly decided which TOP_25
money risks are approved, rejected, blocked, or still pending.

## Scope

Update documentation only. Do not execute production, migration, deploy, D1
write, D1 export/import/execute, feature flag change, dashboard change, or
financial formula change.

## Required Inputs

Provide item-by-item Ramadan decisions for:

1. TOP_25 ranks 1-25.
2. Money reconciliation approval.
3. Backend totals authority approval.
4. Deposit liability and refund handling.
5. Receivables lifecycle and allocation.
6. Legacy numeric/decimal conversion warnings.

Allowed decision values:

- APPROVED
- REJECTED
- PENDING_REVIEW
- MANUAL_REQUIRED
- BLOCKED

If Ramadan does not explicitly approve an item, Codex must not mark it
`APPROVED`.

## Required Updates

Update:

1. `COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md`
2. `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md`
3. `MONEY_RISK_RAMADAN_REVIEW_CHECKLIST.md`
4. `COMMERCIAL_LAUNCH_MISSING_SIGNOFF_LIST.md`
5. `COMMERCIAL_LAUNCH_READINESS_RESULT.md`
6. `COMMERCIAL_LAUNCH_READINESS_MATRIX.md`
7. `RAMADAN_SIGNOFF_ACTION_LIST.md`
8. `RUN_REPORT.md`
9. `VERIFICATION_STATUS.md`
10. `NEXT_MORNING_REVIEW.md`

## Required Verification

Run:

```powershell
npm run format:check
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run qa:employee-entry-staging
```

`qa:employee-entry-staging` must remain `MANUAL_REQUIRED / DRY_RUN_ONLY`.

## Safety Rules

- No production deploy.
- No staging deploy.
- No production migration.
- No staging migration.
- No production D1 write.
- No staging D1 write.
- No production-copy D1 write.
- No D1 export/import/execute.
- No production URL call.
- No production feature flags.
- No secret commit.
- No password/token/cookie printing.
- Do not change commercial launch to GO unless all required signoffs are
  explicitly approved in a later production preflight task.

Production remains `PRODUCTION_NO_GO` unless the commercial launch gate proves
otherwise after explicit signoffs.

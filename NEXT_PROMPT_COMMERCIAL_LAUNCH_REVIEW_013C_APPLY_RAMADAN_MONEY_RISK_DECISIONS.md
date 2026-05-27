# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-013C Apply Ramadan Money Risk Decisions

Use this prompt only after Ramadan Habib has filled
`RAMADAN_MONEY_RISK_DECISION_INPUT_TEMPLATE.md` with explicit item-by-item
decisions.

## Goal

Apply Ramadan's TOP_25 money risk decisions to documentation and signoff
tracking only.

## Strict Safety Rules

1. Do not execute production deploy.
2. Do not execute staging deploy.
3. Do not execute production migration.
4. Do not execute remote production D1 migration.
5. Do not write production D1.
6. Do not write staging D1.
7. Do not write production-copy D1.
8. Do not execute D1 export/import/execute.
9. Do not call production URL.
10. Do not modify production config.
11. Do not enable production feature flags.
12. Do not commit secrets.
13. Do not print password/token/cookie.
14. Do not change commercial launch to GO unless a later gate and explicit
    production preflight allow it.
15. Do not mark any unfilled risk as approved.

## Required Inputs

Read:

1. `RAMADAN_MONEY_RISK_DECISION_INPUT_TEMPLATE.md`
2. `RAMADAN_TOP_25_MONEY_RISK_DECISION_SHEET.md`
3. `RAMADAN_TOP_5_MONEY_DECISIONS.md`
4. `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md`
5. `COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md`

## Required Updates

Update only documentation:

1. `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md`
2. `COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md`
3. `MONEY_RISK_SIGNOFF_UPDATE_RESULT.md`
4. `COMMERCIAL_LAUNCH_READINESS_RESULT.md`
5. `COMMERCIAL_LAUNCH_READINESS_MATRIX.md`
6. `COMMERCIAL_LAUNCH_MISSING_SIGNOFF_LIST.md`
7. `RAMADAN_SIGNOFF_ACTION_LIST.md`
8. `RUN_REPORT.md`
9. `VERIFICATION_STATUS.md`
10. `NEXT_MORNING_REVIEW.md`

## Approval Rules

- Only risks with explicit `APPROVE`, `FALSE_POSITIVE`, or
  `NOT_PRODUCTION_BLOCKING` decisions may be marked closed.
- `NEEDS_ACCOUNTING_DECISION`, `KEEP_OPEN`, and `NEEDS_FIX` remain open.
- SO-007 can move to `APPROVED` only if every TOP_25 risk has an explicit
  acceptable closure decision.
- Production remains `PRODUCTION_NO_GO` unless all production-blocking signoffs
  close in a later approved preflight.

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

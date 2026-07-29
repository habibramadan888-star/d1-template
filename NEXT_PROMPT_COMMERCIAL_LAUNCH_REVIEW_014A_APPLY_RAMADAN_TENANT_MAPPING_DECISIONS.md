# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-014A Apply Ramadan Tenant Mapping Decisions

Use this prompt only after Ramadan Habib fills tenant/property mapping decisions
from `RAMADAN_TENANT_PROPERTY_MAPPING_DECISION_SHEET.md` or provides explicit
item-by-item decisions in the chat.

## Goal

Apply Ramadan Habib's tenant/property mapping decisions to documentation and
the commercial launch signoff tracker.

## Strictly Forbidden

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
13. Do not print password, token, or cookie.
14. Do not change commercial launch to GO.
15. Do not mark any Partial P0 Verified.
16. Do not automatically approve any mapping Ramadan did not explicitly decide.
17. Do not modify business code, dashboard, or financial formula.

## Required Inputs

Ramadan decisions must use only these values:

- APPROVE
- KEEP_OPEN
- NEEDS_FIX
- NEEDS_DATA_REVIEW
- NEEDS_BUSINESS_DECISION
- NOT_PRODUCTION_BLOCKING

## Required Outputs

1. Update `RAMADAN_TENANT_PROPERTY_MAPPING_DECISION_SHEET.md`.
2. Update `TENANT_PROPERTY_MAPPING_RISK_SUMMARY.md`.
3. Update `RAMADAN_TENANT_MAPPING_REVIEW_CHECKLIST.md`.
4. Update `COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md`.
5. Update `COMMERCIAL_LAUNCH_MISSING_SIGNOFF_LIST.md`.
6. Update `COMMERCIAL_LAUNCH_READINESS_RESULT.md`.
7. Update `COMMERCIAL_LAUNCH_READINESS_MATRIX.md`.
8. Update `RAMADAN_SIGNOFF_ACTION_LIST.md`.
9. Keep production status `PRODUCTION_NO_GO` unless a later explicit production
   preflight task changes gate inputs.

## Validation

Run:

```powershell
npm run format:check
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run qa:employee-entry-staging
```

`qa:employee-entry-staging` must remain `MANUAL_REQUIRED / DRY_RUN_ONLY`
without confirmation flags.

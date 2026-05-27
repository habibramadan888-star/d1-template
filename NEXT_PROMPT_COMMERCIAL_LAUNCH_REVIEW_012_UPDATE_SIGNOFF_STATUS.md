# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-012 Update Signoff Status

Use after human reviewers provide signoff decisions for one or more signoff IDs
from `COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md`.

Goal:

Update documentation to reflect human signoff decisions.

Strict scope:

1. Only update documents.
2. Do not execute production.
3. Do not execute migration.
4. Do not deploy.
5. Do not write production, staging, or production-copy D1.
6. Do not run D1 export/import/execute.
7. Do not call production URL.
8. Do not modify production config.
9. Do not enable production feature flags.
10. Do not mark Partial P0 items Verified unless a separate approved task
    provides valid production-grade evidence.

Required input:

For each signoff update, provide:

1. Signoff ID.
2. Decision: `APPROVED`, `REJECTED`, `MANUAL_REQUIRED`, or `BLOCKED`.
3. Reviewer person/team.
4. Evidence reviewed.
5. Scope: dry-run only or production approval.
6. Conditions or notes.

Required output:

1. Updated signoff tracker.
2. Updated missing signoff list.
3. Updated responsibility matrix if owner assignments changed.
4. Updated production GO / NO-GO matrix.
5. Updated status reports.

Gate rule:

- `npm run gate:commercial-launch` must still be reported according to actual
  signoff state.
- If all required signoffs are complete, the next step is production preflight,
  not direct cutover.

# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-019 Apply Ramadan Preflight-Only Decisions

Use this prompt only after Ramadan Habib explicitly marks selected REVIEW-018
items as `APPROVED_FOR_PREFLIGHT_ONLY`, `KEEP_OPEN`, `NEEDS_FIX`,
`MANUAL_REQUIRED`, or `BLOCKED`.

## Strict Limits

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
13. Do not print password, token, or cookie values.
14. Do not mark commercial launch GO.
15. Do not mark any Partial P0 Verified.
16. Do not treat preflight approval as production approval.
17. Do not modify business code, dashboard, or financial formula.

## Required Inputs

Ramadan Habib must provide item-by-item decisions for the REVIEW-018
preflight-only packet:

- SO-006 money reconciliation.
- SO-008 tenant/property final SaaS mapping.
- SO-009 legacy CORPID fallback policy.
- SO-010 receivables lifecycle.
- SO-011 receivables allocation.
- SO-012 audit/event scope.
- SO-013 backend totals authority.
- SO-014 employee entry cutover.
- SO-015 handover atomic cutover.

Allowed decision values:

- `APPROVED_FOR_PREFLIGHT_ONLY`
- `KEEP_OPEN`
- `NEEDS_FIX`
- `MANUAL_REQUIRED`
- `BLOCKED`

## Codex Actions

1. Read `PRODUCTION_PREFLIGHT_ONLY_APPROVAL_PACKET.md`.
2. Read `READY_FOR_PREFLIGHT_REVIEW_MATRIX.md`.
3. Read `COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md`.
4. Apply only the explicit Ramadan decisions.
5. Update documentation and signoff tracker only.
6. Keep all production write/deploy/cutover fields as not approved.
7. Keep production cutover as `PRODUCTION_NO_GO`.
8. Run:
   - `npm run format:check`
   - `npm run check`
   - `npm run security:secrets`
   - `npm run gate:commercial-launch`
   - `npm run qa:employee-entry-staging`

## Output

Report:

1. Current branch.
2. Commit hash.
3. Which items were marked `APPROVED_FOR_PREFLIGHT_ONLY`.
4. Which items remain open.
5. Whether any production approval was granted.
6. Production cutover status.
7. Next recommended task.

Stop after updating documents. Do not enter production.

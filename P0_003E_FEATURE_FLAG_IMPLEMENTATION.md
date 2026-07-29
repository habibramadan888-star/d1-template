# P0-003E Feature Flag Implementation

Generated: 2026-05-25

Feature flag: `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING`

Implementation scope: internal staging/local rehearsal mode in
`scripts/compare-staging-backend-totals.mjs`,
`scripts/rehearse-backend-totals-staging-switch.mjs`, and related tests. No
remote staging or production feature flag was changed.

| Env             | Flag  | Expected Behavior           |
| --------------- | ----- | --------------------------- |
| production      | true  | disabled                    |
| production      | false | disabled                    |
| staging         | false | legacy                      |
| staging         | true  | backend totals staging mode |
| missing APP_ENV | any   | production-safe disabled    |

## Guard Behavior

- `APP_ENV=production` always resolves to `LEGACY` with
  `productionDisabled=true`.
- Missing or unsupported `APP_ENV` resolves to `LEGACY`.
- `APP_ENV=staging` plus flag `true` resolves to staging-only backend totals
  switch rehearsal mode.
- Flag `false` restores legacy behavior.

## Safety Result

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Remote staging feature flag changed: no.
- Dashboard live result changed: no.
- Secret exposure: no.

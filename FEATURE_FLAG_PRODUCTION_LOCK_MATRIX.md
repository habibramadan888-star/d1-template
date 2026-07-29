# Feature Flag Production Lock Matrix

Generated: 2026-05-25T04:10:00+04:00

Scope: static regression guard for local/staging-only routes and production
lock behavior. This matrix does not deploy, migrate, or change runtime
configuration.

| Area                             | Required Lock                                                                  | Source Worker                                                   | Embedded Worker                                                 | Status                                 |
| -------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| Handover staging endpoint        | `/api/staging/handover/commit` present behind `ENABLE_HANDOVER_ATOMIC_STAGING` | Covered by `tests/feature-flag-production-lock-matrix.spec.mjs` | Covered by `tests/feature-flag-production-lock-matrix.spec.mjs` | Guarded                                |
| Handover production behavior     | `APP_ENV=production` returns 404 for staging endpoint                          | Covered                                                         | Covered                                                         | Guarded                                |
| Employee entry adapter rehearsal | `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` exists                              | Covered                                                         | Drift state is observable and requires deploy gate review       | MANUAL_REQUIRED before embedded deploy |
| Employee entry flag off          | Flag off returns legacy path                                                   | Covered by static guard plus route-switch tests                 | Drift state is observable and requires deploy gate review       | MANUAL_REQUIRED before embedded deploy |
| Employee entry production lock   | Production is outside allowed adapter environments                             | Covered by static guard plus production-lock test               | Drift state is observable and requires deploy gate review       | MANUAL_REQUIRED before embedded deploy |
| Frontend totals authority        | Frontend totals must not be accounting authority                               | Covered by static guard and backend totals tests                | Drift state is observable and requires deploy gate review       | MANUAL_REQUIRED before embedded deploy |

## Verification

| Command                            | Result                           | Notes                                         |
| ---------------------------------- | -------------------------------- | --------------------------------------------- |
| `npm run test:feature-flag-matrix` | Pending until stage verification | Static source and embedded Worker guard check |

## Commercial Meaning

- Future source edits that remove the staging handover flag, production 404
  behavior, employee-entry adapter flag, allowed environment gate, or
  frontend-total non-authority marker should fail regression checks.
- Current embedded artifact state for the P0-001J employee-entry route switch is
  treated as manual deploy-gate evidence, not as production approval. If the
  actual staging deploy uses `src/index.embedded.js`, controlled embedded write
  and post-write verification are still required.
- This does not approve production cutover. It only protects local/staging
  rehearsal gates from accidental drift.

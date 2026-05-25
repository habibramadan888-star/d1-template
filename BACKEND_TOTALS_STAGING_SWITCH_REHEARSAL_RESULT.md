# Backend Totals Staging Switch Rehearsal Result

Generated: 2026-05-25T16:10:24.491Z

Scope: staging/local rehearsal only. This script does not deploy, migrate, change remote feature flags, write D1 rows, mutate API responses, or change dashboard output.

Target Worker: `homelink-finance-staging`
Target Worker URL: `https://homelink-finance-staging.habibramadan888.workers.dev`
Target D1: `homelink-finance-staging` (`4ff78bfc-3855-436b-aefb-6b492145d79c`)

Overall: `PASS`

Feature flag rehearsal:

- Before: `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING=false`
- During: `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING=true` in local staging-mode evaluation only
- After rollback: `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING=false`
- Rollback verified: `yes`

| Scenario                                                  |                Legacy Total |                        Backend Total | Mode                   | Delta | Result      | Notes                                                                          |
| --------------------------------------------------------- | --------------------------: | -----------------------------------: | ---------------------- | ----: | ----------- | ------------------------------------------------------------------------------ |
| cash total                                                |                       80.00 |                                80.00 | BACKEND_TOTALS_STAGING |  0.00 | PASS        | Approved staging candidate uses backend authority candidate in rehearsal only. |
| bank transfer total                                       |                        0.00 |                                 0.00 | BACKEND_TOTALS_STAGING |  0.00 | PASS        | Approved staging candidate uses backend authority candidate in rehearsal only. |
| bank transfer count                                       |                           0 |                                    0 | BACKEND_TOTALS_STAGING |     0 | PASS        | Approved staging candidate uses backend authority candidate in rehearsal only. |
| gross received                                            |                       80.00 |                                80.00 | BACKEND_TOTALS_STAGING |  0.00 | PASS        | Approved staging candidate uses backend authority candidate in rehearsal only. |
| rent received                                             |                       80.00 |                                80.00 | BACKEND_TOTALS_STAGING |  0.00 | PASS        | Approved staging candidate uses backend authority candidate in rehearsal only. |
| session totals: stg-ee-session-1779711007144-1e4a78-valid | cash 80 / bank 0 / gross 80 | cash 80.00 / bank 0.00 / gross 80.00 | BACKEND_TOTALS_STAGING |  0.00 | PASS        | Approved staging candidate uses backend authority candidate in rehearsal only. |
| legacy decimal / fils conversion                          |          1 transaction rows |                1 warnings / 0 errors | SHADOW_ONLY            |  0.00 | SHADOW_ONLY | Not in approved staging switch scope; retained for evidence only.              |
| voided records exclusion                                  |             0 excluded rows |    active totals exclude voided rows | BACKEND_TOTALS_STAGING |  0.00 | PASS        | Approved staging candidate uses backend authority candidate in rehearsal only. |
| active records totals                                     |             1 included rows |                        1 active rows | BACKEND_TOTALS_STAGING |  0.00 | PASS        | Approved staging candidate uses backend authority candidate in rehearsal only. |
| arrears outstanding                                       |                        0.00 |                                 0.00 | SHADOW_ONLY            |  0.00 | SHADOW_ONLY | BLOCKED_BY_P0_008; total remains legacy/shadow-only and is not switched.       |
| dashboard/history API current result                      |             MANUAL_REQUIRED |     read-only D1 candidate generated | SHADOW_ONLY            |  0.00 | SHADOW_ONLY | Not in approved staging switch scope; retained for evidence only.              |
| handover totals: locked staging QA evidence               |                        PASS |                                 PASS | BACKEND_TOTALS_STAGING |  0.00 | PASS        | Approved staging candidate uses backend authority candidate in rehearsal only. |

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging D1 write: no.
- Remote staging feature flag changed: no.
- API response mutation: no.
- Dashboard mutation: no.
- Secret/password/token/cookie printed: no.

Commercial gate:

```text
> homelink-finance@0.1.0 gate:commercial-launch
> node scripts/gate-commercial-launch-readiness.mjs

COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO
COMMERCIAL_LAUNCH_AREAS=17
COMMERCIAL_LAUNCH_NO_GO=12
COMMERCIAL_LAUNCH_MANUAL_REQUIRED=1
COMMERCIAL_LAUNCH_BLOCKED=0
```

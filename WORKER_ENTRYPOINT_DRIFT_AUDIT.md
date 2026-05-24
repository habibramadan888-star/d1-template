# Worker Entrypoint Drift Audit

Scope: P1-006 controlled embedded Worker drift review. This script is read-only and does not overwrite deploy artifacts.

## Entrypoints

- Source Worker: `deploy-worker\src\index.js`
- Embedded Worker artifact: `deploy-worker\src\index.embedded.js`
- Source SHA-256: `3951fc8d8ea49d17696502993a3ee8d1cd2ec9d5d2b0ea78b630501985b63572`
- Embedded SHA-256: `b8f84fc86018c50a7799d4d4b97fe22bfd2915e65d75880d06883acb8b296e07`
- Source API/auth route literals found: 23
- Embedded API/auth route literals found: 23

## Critical Behavior Comparison

| Item                                   | Source Worker | Embedded Worker | Match | Risk  | Recommendation                                                                                                              |
| -------------------------------------- | ------------- | --------------- | ----- | ----- | --------------------------------------------------------------------------------------------------------------------------- |
| `/api/staging/handover/commit`         | Yes           | Yes             | Yes   | P0/P1 | Embedded deploy path must not be used for staging handover validation unless this route is present.                         |
| `ENABLE_HANDOVER_ATOMIC_STAGING guard` | Yes           | Yes             | Yes   | P0/P1 | Feature-flag guard must match source before any staging endpoint can be deployed through embedded artifact.                 |
| `APP_ENV production disabled guard`    | Yes           | Yes             | Yes   | P0/P1 | Production-disabled behavior must exist in any deployable artifact.                                                         |
| `handover staging tables`              | Yes           | Yes             | Yes   | P0/P1 | Staging commit persistence must only be considered validated if table references match source behavior.                     |
| `handover staging audit evidence`      | Yes           | Yes             | Yes   | P1    | Audit evidence paths must exist in the deployed artifact.                                                                   |
| `/api/delete_session`                  | Yes           | Yes             | Yes   | P0    | Delete session route must be present only with void/soft-delete behavior.                                                   |
| `delete_session void behavior`         | Yes           | Yes             | Yes   | P0    | Embedded artifact must preserve P0-004 void behavior; hard delete must not reappear.                                        |
| `/api/me`                              | Yes           | Yes             | Yes   | P1    | Identity route must match source auth semantics.                                                                            |
| `/api/history`                         | Yes           | Yes             | Yes   | P1    | History route drift can make owner history validation differ from deployment.                                               |
| `owner auth routes`                    | Yes           | Yes             | Yes   | P1    | Owner auth route drift blocks credible deployment validation.                                                               |
| `employee auth routes`                 | Yes           | Yes             | Yes   | P1    | Employee auth route drift blocks credible employee flow validation.                                                         |
| `Bearer token auth compatibility`      | Yes           | Yes             | Yes   | P1    | Auth smoke behavior must remain consistent across entrypoints.                                                              |
| `runtime schema compatibility`         | Yes           | Yes             | Yes   | P1    | Runtime DDL remains a P1 risk, but source and embedded artifacts must at least match until migration discipline removes it. |

## Route Drift Comparison

| Item                            | Source Worker | Embedded Worker | Match | Risk  | Recommendation           |
| ------------------------------- | ------------- | --------------- | ----- | ----- | ------------------------ |
| `/api/arrear_tasks`             | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/arrear_tasks/update`      | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/arrears`                  | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/clear_arrear`             | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/customers`                | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/delete_session`           | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/employee/deposit`         | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/employee/entry`           | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/employee/lock/cards`      | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/employee/migrate`         | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/history`                  | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/lock/cards`               | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/me`                       | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/rent_config`              | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/save_session`             | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/security/revoke_sessions` | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/session_detail`           | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/api/staging/handover/commit`  | Yes           | Yes             | Yes   | P0/P1 | No route drift detected. |
| `/api/wifi/accounts`            | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/auth/confirm-manager`         | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/auth/employee-login`          | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/auth/login`                   | Yes           | Yes             | Yes   | P3    | No route drift detected. |
| `/auth/logout`                  | Yes           | Yes             | Yes   | P3    | No route drift detected. |

## Deployment Risk

- Critical behavior mismatches: 0
- Route mismatches: 0
- Staging handover route missing from embedded: No
- Staging deploy using embedded artifact: Needs entrypoint confirmation
- Production deploy using embedded artifact: Needs standard deploy gate
- Source `wrangler.toml` path remains the local verification target; embedded deploy path needs separate approval.

## Recommendation

1. Do not deploy through `wrangler.embedded.toml` while critical mismatches remain.
2. Keep local/staging validation on `deploy-worker/src/index.js` unless a controlled embedded write is approved.
3. Run `npm run verify:embedded-worker` and `npm run build:embedded:dry-run` before any deploy-prep decision.
4. Treat this as a deployment-artifact gate, not as production deployment approval.

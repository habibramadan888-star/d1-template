# Arrears Directive Production Worker Route Audit

Timestamp: 2026-05-31T18:00:00Z

## Scope

This audit checks why the previous production-linked arrears directive smoke was blocked by:

`POST /api/boss/arrears/directives = 404`

No production write gate was enabled. No D1 execute/export/import was run for this audit. No directive or employee follow-up was created.

## Findings

| Route | Local Exists | Live Exists | Current Live Response | Expected Gated Response | Gap |
|---|---|---|---|---|---|
| POST /api/boss/arrears/directives | yes | no | 404 / not_found | non-404 approval-required / gated response while write gate is off | live Worker missing route |
| GET /api/employee/arrears/directives | yes | partially inaccessible | 403 / forbidden during current live check | authenticated employee read response, non-404 | live route/auth path not aligned with Backend SOT |
| POST /api/employee/arrears/directives/:id/followup | yes | not proven as SOT | 403 / forbidden during current live check | non-404 approval-required / gated response while write gate is off | live Worker not aligned with SOT |

## Static Asset Check

| Check | Result |
|---|---|
| live /index-51-main.js contains /api/boss/arrears/directives | no |
| live /index-51-main.js contains legacy /api/arrear_tasks/directive | yes |
| local deploy-worker/src/index.js contains handleBossArrearsDirectives | yes |
| local deploy-worker/src/index.js contains handleEmployeeArrearsDirectiveFollowup | yes |
| local deploy-worker/src/index.js wires /api/boss/arrears/directives | yes |

## Version / Commit Evidence

| Item | Value |
|---|---|
| current live deployment version before route deploy | 33c192a8-f0c9-4c41-8839-07e1c7fa1803 |
| last non-secret code deployment before route deploy | 73517bf9-df6e-47e1-a72f-9743264ee934 |
| local commit that introduced directive routes | 44f3861 fix: define and wire arrears directive delivery closure |
| previous smoke result commit | 60f8f3a test: record production arrears directive smoke |

## Root Cause Classification

| Classification | Result | Evidence |
|---|---|---|
| LIVE_WORKER_MISSING_DIRECTIVE_ROUTES | yes | owner POST route returns 404 while local route exists |
| ROUTE_PATH_MISMATCH | yes | live JS still references legacy /api/arrear_tasks/directive |
| STATIC_ONLY_DEPLOY_MISSED_BACKEND | likely | local backend route exists but live Worker does not expose it |
| AUTH_ROUTE_GUARD_MISREPORTING_404 | no | authenticated owner request still returns 404 |
| UNKNOWN | no | evidence points to live Worker route/version drift |

## Safety Notes

- Write gate remained off during audit.
- Password/token/cookie/Set-Cookie were not printed.
- No production D1 execute/export/import command was used for this audit.
- No business write was executed.
- Production cutover remains `PRODUCTION_NO_GO`.

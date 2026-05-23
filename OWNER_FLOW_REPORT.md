# Owner Flow Report

Date: 2026-05-23  
Environment: local Worker on `http://127.0.0.1:8793`  
Production mutation: none

## Checks Performed

| Check                     | Result  | Notes                                                       |
| ------------------------- | ------- | ----------------------------------------------------------- |
| Owner page opens          | PASS    | `GET /index-51.html` returned 200                           |
| Browser title             | PASS    | `Homelink · 流水管理`                                       |
| Login input exists        | PASS    | Browser check found `#empCode`                              |
| Dashboard after login     | BLOCKED | local owner credentials not configured                      |
| Statistics APIs           | BLOCKED | login required                                              |
| Tables render after login | BLOCKED | login required                                              |
| Critical buttons          | PARTIAL | login page button visible; authenticated buttons not tested |

## Static Findings

- `index-51-main.js` now passes syntax/typecheck and lint after ESLint config correction.
- Owner dashboard still relies heavily on frontend aggregation.
- API base URL is hardcoded to production Workers URL when not served from production host.

## Risks

### P0

- Owner authenticated flow cannot be validated without local secrets.
- Owner financial statistics must not remain browser-only authority for commercial launch.

### P1

- Need regression tests for dashboard metrics.
- Need failure-state tests for API unavailable/auth expired.
- Need mobile/tablet owner dashboard visual pass.
- Need export/import history tests.

## Safe Next Owner Tests

After local `.dev.vars` is configured:

1. Login as owner.
2. Confirm `/api/me` returns manager.
3. Confirm owner can access `/api/history`.
4. Confirm owner can access `/api/rent_config`.
5. Confirm owner dashboard renders empty state on clean local D1.
6. Confirm staff account cannot access owner endpoints.
7. Confirm delete/session void risk is not executed against real data.

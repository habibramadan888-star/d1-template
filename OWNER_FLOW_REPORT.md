# Owner Flow Report

Date: 2026-05-23  
Environment: local Worker on `http://127.0.0.1:8793`  
Production mutation: none

## Checks Performed

| Check                     | Result  | Notes                                                       |
| ------------------------- | ------- | ----------------------------------------------------------- |
| Owner page opens          | PASS    | `GET /index-51.html` returned 200                           |
| Browser title             | PASS    | `Homelink 路 娴佹按绠＄悊`                                  |
| Login input exists        | PASS    | Browser check found `#empCode`                              |
| Owner login               | PASS    | local non-production `.dev.vars`; `/auth/login` 200         |
| Owner `/api/me`           | PASS    | returned manager role                                       |
| Dashboard after login     | NOT RUN | next authenticated browser workflow test                    |
| Statistics APIs           | NOT RUN | next authenticated API workflow test                        |
| Tables render after login | NOT RUN | next authenticated browser workflow test                    |
| Critical buttons          | PARTIAL | login page button visible; authenticated buttons not tested |

## Static Findings

- `index-51-main.js` passes syntax/typecheck and lint after ESLint config correction.
- Owner dashboard still relies heavily on frontend aggregation.
- API base URL is hardcoded to production Workers URL when not served from production host.

## Authenticated Smoke Result

```text
PASS owner login 200
PASS owner /api/me 200
PASS owner role manager
```

## Risks

### P0

- Owner financial statistics must not remain browser-only authority for commercial launch.
- Owner dashboard and statistics APIs still need authenticated browser/API validation.

### P1

- Need regression tests for dashboard metrics.
- Need failure-state tests for API unavailable/auth expired.
- Need mobile/tablet owner dashboard visual pass.
- Need export/import history tests.

## Safe Next Owner Tests

1. Confirm owner can access `/api/history`.
2. Confirm owner can access `/api/rent_config`.
3. Confirm owner dashboard renders empty state on clean local D1.
4. Confirm delete/session void risk is not executed against real data.

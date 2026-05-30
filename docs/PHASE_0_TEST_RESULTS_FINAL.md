# Phase 0 Smoke Test Results

Generated: 2026-05-30T06:52:20.441Z

Environment: Local Worker smoke against http://127.0.0.1:8801

Decision: NO-GO

## Summary

| Metric          | Value | Target | Status |
| --------------- | ----: | -----: | ------ |
| Tests run       |    30 |     30 | PASS   |
| Tests passed    |     3 |     30 | FAIL   |
| Tests failed    |    27 |      0 | FAIL   |
| Pass rate       | 10.0% |   100% | FAIL   |
| Average latency |  25ms | <100ms | PASS   |

## Results By Category

| Category  | Passed | Failed | Total | Pass Rate |
| --------- | -----: | -----: | ----: | --------: |
| Auth      |      3 |      1 |     4 |     75.0% |
| Employee  |      0 |      8 |     8 |      0.0% |
| Owner     |      0 |      6 |     6 |      0.0% |
| Admin     |      0 |      6 |     6 |      0.0% |
| Isolation |      0 |      3 |     3 |      0.0% |
| Health    |      0 |      3 |     3 |      0.0% |

## Failure Summary

| Reason             | Count |
| ------------------ | ----: |
| ADMIN_AUTH_MISSING |     1 |
| PERMISSION_DENIED  |     9 |
| ROUTE_NOT_WIRED    |    17 |

## Detailed Results

|   # | Category  | Test                    | Expected | Actual | Latency | Result | Notes                                                   |
| --: | --------- | ----------------------- | -------- | ------ | ------: | ------ | ------------------------------------------------------- |
|   1 | Auth      | Employee Login          | 200      | 200    |   121ms | PASS   |                                                         |
|   2 | Auth      | Owner Login             | 200      | 200    |    82ms | PASS   |                                                         |
|   3 | Auth      | Admin Login             | 200      | 200    |    87ms | FAIL   | readonly admin credential unavailable; got role manager |
|   4 | Auth      | Auth Route Closure      | 301/302  | 302    |    10ms | PASS   | http://127.0.0.1:8801/owner                             |
|   5 | Employee  | Property List           | 200      | 403    |    20ms | FAIL   | expected 200, got 403: {"error":"forbidden"}            |
|   6 | Employee  | Entries List            | 200      | 403    |    18ms | FAIL   | expected 200, got 403: {"error":"forbidden"}            |
|   7 | Employee  | Payments                | 200      | 403    |    21ms | FAIL   | expected 200, got 403: {"error":"forbidden"}            |
|   8 | Employee  | Customers               | 200      | 403    |    20ms | FAIL   | expected 200, got 403: {"error":"forbidden"}            |
|   9 | Employee  | Dashboard               | 200      | 403    |    20ms | FAIL   | expected 200, got 403: {"error":"forbidden"}            |
|  10 | Employee  | Dashboard Totals        | 200      | 403    |    18ms | FAIL   | expected 200, got 403: {"error":"forbidden"}            |
|  11 | Employee  | Receivables             | 200      | 403    |    18ms | FAIL   | expected 200, got 403: {"error":"forbidden"}            |
|  12 | Employee  | Arrears                 | 200      | 403    |    19ms | FAIL   | expected 200, got 403: {"error":"forbidden"}            |
|  13 | Owner     | Owner Dashboard         | 200      | 404    |    15ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  14 | Owner     | Owner Properties        | 200      | 404    |    14ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  15 | Owner     | Owner Totals            | 200      | 404    |    19ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  16 | Owner     | Owner History           | 200      | 404    |    18ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  17 | Owner     | Owner Arrears           | 200      | 404    |    20ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  18 | Owner     | Owner Reports           | 200      | 404    |    16ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  19 | Admin     | Admin Dashboard         | 200      | 404    |    16ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  20 | Admin     | Admin Entries (RO)      | 200      | 404    |    17ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  21 | Admin     | Admin Totals            | 200      | 404    |    17ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  22 | Admin     | Admin History           | 200      | 404    |    15ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  23 | Admin     | Admin Audit Trail       | 200      | 404    |    15ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  24 | Admin     | Admin Permissions (403) | 403      | 404    |    16ms | FAIL   | expected 403, got 404: {"error":"not_found"}            |
|  25 | Isolation | Employee Cross-Property | 200      | 403    |    15ms | FAIL   | expected 200, got 403: {"error":"forbidden"}            |
|  26 | Isolation | Owner Cross-Tenant      | 200      | 404    |    19ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  27 | Isolation | Admin Full Access       | 200      | 404    |    20ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  28 | Health    | System Uptime           | 200      | 404    |    15ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  29 | Health    | Error Rate              | 200      | 404    |    19ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |
|  30 | Health    | Database                | 200      | 404    |    15ms | FAIL   | expected 200, got 404: {"error":"not_found"}            |

## Analysis

The Phase 0 smoke matrix did not pass. This is an execution result, not a simulated result.

Primary blockers:

- Planned /api/properties, /api/entries, /api/payments, /api/dashboard, /api/receivables, owner, admin, health, and metrics routes are not wired in the current Worker route table.
- /api/dashboard/totals has a candidate handler in deploy-worker/src/handlers/dashboard-totals.js, but the live route returns 404.
- Local readonly admin credentials are not configured, so admin portal API smoke cannot be validated.
- Existing live API surface is closer to the legacy Worker contract: /auth/login, /auth/employee-login, /api/me, /api/customers, /api/arrears, /api/history, and /api/rent_config.

## Recommendation

Do not mark Phase 0 as passed.

Required next actions:

1. Decide whether Phase 0 should validate the legacy Worker API or the future enterprise API matrix.
2. If validating the future matrix, wire the missing routes behind safe feature flags before rerunning this smoke suite.
3. Add a local readonly-admin credential or adjust the admin smoke cases to the actual auth model.
4. Rerun node scripts/execute-phase0-tests.js.

Production status remains PRODUCTION_NO_GO.

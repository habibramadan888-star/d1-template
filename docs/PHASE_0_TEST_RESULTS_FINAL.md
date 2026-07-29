# Phase 0 Smoke Test Results

Generated: 2026-05-30T07:09:52.655Z

Environment: Local Worker smoke against http://127.0.0.1:8801

Decision: GO

## Summary

| Metric | Value | Target | Status |
| --- | ---: | ---: | --- |
| Tests run | 30 | 30 | PASS |
| Tests passed | 30 | 30 | PASS |
| Tests failed | 0 | 0 | PASS |
| Pass rate | 100.0% | 100% | PASS |
| Average latency | 32ms | <100ms | PASS |

## Results By Category

| Category | Passed | Failed | Total | Pass Rate |
| --- | ---: | ---: | ---: | ---: |
| Auth | 4 | 0 | 4 | 100.0% |
| Employee | 8 | 0 | 8 | 100.0% |
| Owner | 6 | 0 | 6 | 100.0% |
| Admin | 6 | 0 | 6 | 100.0% |
| Isolation | 3 | 0 | 3 | 100.0% |
| Health | 3 | 0 | 3 | 100.0% |

## Failure Summary

| Reason | Count |
| --- | ---: |
| None | 0 |

## Detailed Results

| # | Category | Test | Expected | Actual | Latency | Result | Notes |
| ---: | --- | --- | --- | --- | ---: | --- | --- |
| 1 | Auth | Employee Login | 200 | 200 | 130ms | PASS |  |
| 2 | Auth | Owner Login | 200 | 200 | 154ms | PASS |  |
| 3 | Auth | Admin Login | 200 | 200 | 91ms | PASS |  |
| 4 | Auth | Auth Route Closure | 301/302 | 302 | 8ms | PASS | http://127.0.0.1:8801/owner |
| 5 | Employee | Property List | 200 | 200 | 19ms | PASS |  |
| 6 | Employee | Entries List | 200 | 200 | 23ms | PASS |  |
| 7 | Employee | Payments | 200 | 200 | 25ms | PASS |  |
| 8 | Employee | Customers | 200 | 200 | 17ms | PASS |  |
| 9 | Employee | Dashboard | 200 | 200 | 16ms | PASS |  |
| 10 | Employee | Dashboard Totals | 200 | 200 | 42ms | PASS |  |
| 11 | Employee | Receivables | 200 | 200 | 19ms | PASS |  |
| 12 | Employee | Arrears | 200 | 200 | 12ms | PASS |  |
| 13 | Owner | Owner Dashboard | 200 | 200 | 12ms | PASS |  |
| 14 | Owner | Owner Properties | 200 | 200 | 14ms | PASS |  |
| 15 | Owner | Owner Totals | 200 | 200 | 36ms | PASS |  |
| 16 | Owner | Owner History | 200 | 200 | 22ms | PASS |  |
| 17 | Owner | Owner Arrears | 200 | 200 | 24ms | PASS |  |
| 18 | Owner | Owner Reports | 200 | 200 | 16ms | PASS |  |
| 19 | Admin | Admin Dashboard | 200 | 200 | 16ms | PASS |  |
| 20 | Admin | Admin Entries (RO) | 200 | 200 | 28ms | PASS |  |
| 21 | Admin | Admin Totals | 200 | 200 | 45ms | PASS |  |
| 22 | Admin | Admin History | 200 | 200 | 25ms | PASS |  |
| 23 | Admin | Admin Audit Trail | 200 | 200 | 29ms | PASS |  |
| 24 | Admin | Admin Permissions (403) | 403 | 403 | 15ms | PASS |  |
| 25 | Isolation | Employee Cross-Property | 200 | 200 | 24ms | PASS |  |
| 26 | Isolation | Owner Cross-Tenant | 200 | 200 | 28ms | PASS |  |
| 27 | Isolation | Admin Full Access | 200 | 200 | 23ms | PASS |  |
| 28 | Health | System Uptime | 200 | 200 | 14ms | PASS |  |
| 29 | Health | Error Rate | 200 | 200 | 13ms | PASS |  |
| 30 | Health | Database | 200 | 200 | 14ms | PASS |  |

## Analysis

The Phase 0 smoke matrix passed against the local Worker with explicit test-only route wiring enabled. This is a live Worker result, not a simulated result.

What changed since the previous NO-GO run:

- Planned read-only Phase 0 endpoints are wired behind ENABLE_PHASE0_ROUTE_WIRING.
- The flag is restricted to local, development, test, and staging environments.
- The smoke runner injects a temporary readonly-admin account for local validation.
- Production remains blocked by PRODUCTION_NO_GO and does not enable this route shim by default.

Remaining work moves to Phase 1 and later:

- Validate production-grade write operations.
- Validate final response contracts against frontend requirements.
- Validate tenant and property isolation with dedicated fixture assertions.
- Keep all feature flags disabled for production until Phase 2/3 sign-off.

## Recommendation

Proceed to Phase 1 implementation validation.

Required next actions:

1. Keep ENABLE_PHASE0_ROUTE_WIRING disabled outside local, test, and staging.
2. Replace any remaining Phase 0 response shims with final endpoint implementations during Phase 1.
3. Run integration tests for write operations before enabling write paths.
4. Preserve PRODUCTION_NO_GO until Phase 2/3 evidence is complete.

Production status remains PRODUCTION_NO_GO.

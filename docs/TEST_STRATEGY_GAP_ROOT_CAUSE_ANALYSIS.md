# Test Strategy Gap Root Cause Analysis

Scope: static test strategy review only. No tests or code were modified.

## Observed Pattern

Automated tests pass, but real phone QA still finds failures:

- auth route flashes and old-login loops
- mobile layout density issues
- employee identity display regressions
- owner history perceived slow loading
- modal/export formatting problems

This means the current suite is valuable but not sufficient as product acceptance.

## Root Cause 1: Automated Environment Does Not Match Real Phone

| Dimension       | Current Evidence                                                                                     | Gap                                                                    | Required Fix                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Browser engine  | `package.json` uses Node built-in test runner; no Playwright, Puppeteer, or Appium dependency found. | No real DOM/browser rendering in most tests.                           | Add browser-based smoke for root portal, employee, owner, admin routes.    |
| Device viewport | Tests include static mobile CSS contract checks.                                                     | Real Android/iOS browser viewport and touch behavior are not executed. | Add mobile viewport browser test and manual screenshot checklist.          |
| Network         | Tests cover some weak-network fixture logic for handover, but not live UI route latency.             | No systematic network throttling for history/auth pages.               | Add throttled browser smoke for history, auth bootstrap, and logout.       |
| Data volume     | Tests assert `limit` usage and source-level pagination behavior.                                     | No production-copy large-history performance benchmark.                | Run production-copy read-only performance profile before write QA.         |
| Cache state     | Tests check stale localStorage role in source.                                                       | Real browser cache/stale assets can still cause old JS.                | Add cache-busted live smoke and Worker asset freshness gate before deploy. |

## Root Cause 2: Coverage Is Heavy On Static Source Contracts

Current test suite strengths:

- auth route source contracts
- readonly admin role and write-denial unit checks
- tenant claim and route enforcement gates
- money and receivables module tests
- owner/employee UI CSS/source checks
- no-legacy-login source regression tests

Current blind spots:

- browser paint order
- old login flash before `/api/me`
- back-button behavior with real history stack
- mobile overflow caused by browser font/rendering differences
- real session cookie behavior across redirects
- history load timing with real data and network

## Root Cause 3: Permission Tests Need End-To-End Runtime Proof

Readonly admin is represented in source:

- `READONLY_ADMIN_ROLES`
- `/api/me` exposes `isReadonlyAdmin` and `canWrite`
- owner UI toggles read-only mode
- server `canWriteOwnerData()` only allows manager role

Remaining risk:

- A write endpoint missed by static tests could still permit a mutation.
- A cached owner state could show write UI before `/api/me`.
- Tests may not POST every live mutation route with a readonly admin session.

Required P0 test:

```text
login as readonly_admin
  -> verify /api/me canWrite=false
  -> GET dashboard/history/clients succeeds
  -> POST every known mutation route returns 403
  -> UI write controls hidden or disabled after server auth resolves
```

## Root Cause 4: History Performance Is Not Proven With Real Data

Current implementation evidence:

- `/api/history` supports `limit` and `offset`.
- Owner UI renders `owner-history-skeleton`.
- Owner UI requests `/api/history?limit=${limit}`.
- Tests assert source-level skeleton and limit usage.

Remaining risk:

- Missing DB index can still make the first 20 rows slow.
- `COUNT`/detail queries may be triggered by surrounding UI.
- Production data volume can expose full-table scan.
- Mobile CPU can make rendering slower than desktop source tests indicate.

Required P1 performance proof:

```text
production-copy dataset
  -> cold cache /owner history
  -> skeleton appears < 300 ms
  -> first 20 rows visible < 1 s target
  -> no full-history response
  -> query plan uses index
```

## Root Cause 5: CI Does Not Include Browser QA

Current CI:

- `.github/workflows/commercial-check.yml`
- Runs `npm ci`
- Runs `npm run check`
- `npm run check` runs governance, secrets, format, lint, syntax, API audit, DB audit, full Node tests, and dry-run build.

Gap:

- No browser worker smoke in CI.
- No phone viewport screenshot comparison.
- No live Worker smoke after deploy unless manually run.

## Scenarios Covered Only By Documentation Or Source Tests

| Scenario                     | Current Coverage                  | Why It Still Fails In Real QA                                     | Automation Upgrade                                            |
| ---------------------------- | --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| Old login page never flashes | Source tests and route redirects. | Browser may render old overlay before auth check.                 | Browser paint-order test with screenshots.                    |
| Logout returns to `/`        | Source tests for handlers.        | Real lock icon can bind wrong handler or stale JS.                | Browser click test for each lock icon.                        |
| Employee name is real name   | Source and helper tests.          | Backend may return weak identity or stale asset may display role. | Runtime `/api/me` fixture plus rendered header assertion.     |
| History loading              | Source tests for skeleton/limit.  | DB/network can still be slow.                                     | Production-copy query plan and browser timing test.           |
| Mobile modal compactness     | Static markup/CSS tests.          | Real viewport/font can overflow.                                  | Browser mobile viewport screenshot acceptance.                |
| Readonly admin write denial  | Unit/source tests.                | Endpoint catalog may miss one route.                              | API catalog generated POST/PUT/DELETE denial test.            |
| Tenant/property isolation    | Helper/gate tests.                | Live route may still use `corpid` only.                           | End-to-end tenant claim route tests against local/staging DB. |

## Recommended Automation Additions

### P0 Before Internal Write QA

- [ ] Browser route test: `/`, `/employee`, `/owner`, `/admin`, old paths.
- [ ] Browser logout test: every lock icon returns to `/`.
- [ ] Browser no-old-login-flash test.
- [ ] Runtime readonly admin API denial for every mutation in API catalog.
- [ ] Employee identity rendered test using fixture identity names.

### P1 Before Production-Copy Write Rehearsal

- [ ] History performance with production-copy data and query plan.
- [ ] Arrears modal mobile browser snapshot.
- [ ] Arrears export snapshot with accounting examples.
- [ ] Tenant/property access matrix executed through route handlers.
- [ ] Idempotency replay tests for all employee entry types.

### P2 Before Production Approval

- [ ] Weak network browser tests for login, history, employee draft, and retry.
- [ ] Multi-user concurrent submit tests.
- [ ] Safari/iOS or WebKit mobile smoke if available.
- [ ] Cache-busted live asset verification after each deploy.

## Exit Standard

1. Each real-device failure has a named root cause or test gap.
2. Each gap has a concrete automation plan.
3. P0 gaps are resolved before internal write QA.
4. P1 gaps are resolved before production-copy write rehearsal.
5. Production remains `PRODUCTION_NO_GO`.

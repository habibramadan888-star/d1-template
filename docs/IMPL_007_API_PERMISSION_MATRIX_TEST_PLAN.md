# IMPL-007 API Permission Matrix Test Plan

Generated: 2026-05-29
Scope: test implementation plan. No new runnable test file was added in this task.

## Rationale

The provided sample integration test uses placeholder credentials and mock token assumptions that would not run safely in the current Node test suite. This document defines the implementable test plan instead of committing a broken test.

## Current Evidence

| Area | Evidence | Status |
|---|---|---|
| Readonly admin tests | `tests/readonly-admin-*.spec.mjs` verify routing and write denial helpers. | Present. |
| Unified auth tests | `tests/unified-login*.spec.mjs` verify server-authority routing and role tamper behavior. | Present. |
| Tenant scope tests | `tests/tenant-scope*.spec.mjs` cover many allow/deny matrices. | Present. |

## Required Matrix

| Endpoint Class | employee/staff | owner/manager | readonly_admin |
|---|---|---|---|
| `/api/me` | 200 | 200 | 200 |
| owner dashboard/history | denied or redirected | 200 scoped | 200 read-only scoped |
| employee entry write | 2xx only for scoped employee in approved route | denied unless explicit tool | 403 |
| handover commit | employee/staff only | 403 | 403 |
| settings write | 403 | manager only | 403 |
| session void/delete | 403 | manager only | 403 |
| customer save | denied unless scoped | manager only | 403 |

## Test Implementation Requirements

- Use existing local Worker harness patterns from current tests.
- Do not use real passwords or production accounts.
- Seed local disposable D1 only.
- Assert backend status codes, not only frontend button visibility.
- Include stale localStorage/front-end role tamper cases.
- Include production no-go assertion.

## Exit Criteria

| Item | Required |
|---|---|
| Route-by-route backend checks | Yes |
| Readonly admin all writes 403 | Yes |
| Employee property scope | Yes |
| Owner tenant scope | Yes |
| No real secrets | Yes |
| Production state | PRODUCTION_NO_GO |

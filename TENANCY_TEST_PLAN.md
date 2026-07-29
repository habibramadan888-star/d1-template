# Tenant Isolation Test Plan

Status: P0-006A plan only. No production deployment or migration was executed.

## Automated Tests Required Before SaaS Launch

| ID      | Scenario                                                                | Expected Result                                                 |
| ------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| TEN-001 | Owner A requests Owner B dashboard/history.                             | 403 or empty scoped result; no B data leaked.                   |
| TEN-002 | Owner A requests Owner B receivables/transactions/deposits.             | 403 or empty scoped result.                                     |
| TEN-003 | Employee A logs in for Property A and requests Property B arrear tasks. | 403 or empty scoped result.                                     |
| TEN-004 | Employee A attempts owner-only route.                                   | 403, as current smoke already partially verifies.               |
| TEN-005 | Employee A submits entry for bed outside assigned property.             | 403 or validation failure before write.                         |
| TEN-006 | Owner A writes rent config for Property A.                              | Only Property A effective config changes.                       |
| TEN-007 | Owner B has same bed code and CID as Owner A.                           | Queries and balances remain isolated by company/property.       |
| TEN-008 | Session token has valid role but missing company/property membership.   | Sensitive APIs reject.                                          |
| TEN-009 | Static `CORPID` differs from session company id.                        | Session/membership scope wins; env value is not data authority. |
| TEN-010 | Dev seed is attempted with `APP_ENV=production`.                        | Seed is rejected.                                               |
| TEN-011 | Cross-tenant export request.                                            | Export contains only authorized company/property rows.          |
| TEN-012 | Void/delete-session from wrong tenant.                                  | 403; no rows voided.                                            |

## Manual Tests

| Test                              | Setup                                                 | Expected Result                                                                        |
| --------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Two owners same Worker            | Create Company A and Company B in staging.            | Login for A cannot see B dashboard, history, arrears, customers, WiFi, or TTLock data. |
| Same employee id in two companies | Create `abdul` in A and B with different memberships. | Login/session resolves exact company context; no cross-company collision.              |
| Property-level staff scope        | Staff assigned to one property only.                  | Staff sees only assigned property follow-up and entry context.                         |
| Owner multi-property view         | Owner has two properties.                             | Dashboard can aggregate explicitly, but detail pages remain filterable by property.    |

## Regression Requirements

- Existing `npm run smoke:with-worker` must continue to prove owner/staff role boundaries.
- New P0-006B tests must add cross-tenant fixtures without production D1.
- Tests must not rely on frontend hiding buttons.
- Tests must verify server-side SQL filters and write authorization.
- Tests must include void/session paths and financial tables.

## Blockers Before Implementation

- Human decision needed: one Worker/D1 shared by all tenants vs isolated Worker/D1 per customer.
- Human decision needed: property membership model and owner/admin hierarchy.
- Production migration cannot be attempted until legacy row-to-property mapping is reconciled.

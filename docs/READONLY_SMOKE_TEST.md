# Readonly Smoke Test Execution Guide

Purpose: verify current system stability before internal implementation testing.

Duration: approximately 30 minutes with parallel execution by 3 testers.

Risk level: read-only only. No writes, no migrations, no production D1 changes.

Frequency: daily during Phase 0, then weekly during development.

## Pre-Test Setup

### Environment Selection

Use staging by default. Production may be used only for strictly read-only checks with explicit approval.

Record:

- Environment name.
- Target URL.
- Commit SHA.
- Test date.
- Tester name.
- Feature flag states.

### Account Handling

Do not commit real test credentials.

Account references in the result sheet should use secure aliases:

- Employee test account alias.
- Owner test account alias.
- Readonly admin test account alias.

Credentials must be obtained from the approved secure channel.

### Preparation Checklist

- Target URL confirmed reachable.
- Health endpoint or equivalent smoke endpoint responds.
- Test account aliases confirmed.
- Evidence folder or shared drive path prepared.
- Browser console and network tab available.
- Result sheet ready.

## Test Cases

### Group 1: Authentication and Authorization

#### Test 1: Employee Login

Action:

1. Navigate to the root entry URL.
2. Log in using the employee test account alias.
3. Wait for redirect.

Expected:

- Redirects to employee business route.
- Employee portal loads.
- Display name is a real identity field, not role text such as `staff`.
- No console error appears.

Result:

- PASS or FAIL.
- Screenshot if FAIL.

#### Test 2: Owner Login

Action:

1. Log out.
2. Log in using the owner test account alias.
3. Wait for redirect.

Expected:

- Redirects to owner business route.
- Owner dashboard loads.
- Dashboard summary is visible.
- No old login page appears.

#### Test 3: Readonly Admin Login

Action:

1. Log out.
2. Log in using the readonly admin test account alias.
3. Wait for redirect.

Expected:

- Redirects to admin or readonly portal.
- Readonly indicator is visible where implemented.
- No write buttons are visible.
- Read-only API behavior is available.

#### Test 4: Legacy Route Closure

Action:

1. Log out.
2. Visit legacy route aliases such as `/owner.html`, `/employee-v3.html`, and `/unified-login.html`.

Expected:

- Legacy routes redirect or normalize to the canonical entry or business alias.
- Old employee PIN UI does not render.
- Old owner login UI does not render.

### Group 2: Employee Read Operations

#### Test 5: Assigned Properties Visible

Expected:

- Employee sees only assigned properties.
- Unauthorized properties are not visible.

#### Test 6: Entries List Loads

Expected:

- Entries list loads.
- Rows are scoped to assigned tenant/property.
- Latency is recorded.
- No console error appears.

#### Test 7: History Loads

Expected:

- History data loads.
- Results sort by date descending where applicable.
- Pagination or load-more behavior works where implemented.
- Latency is recorded.

#### Test 8: Customer List Loads

Expected:

- Customer list loads.
- Data is scoped to employee access.
- No unrelated tenant data appears.

#### Test 9: Dashboard Loads

Expected:

- Dashboard loads.
- Totals and arrears summary display if available.
- Latency is recorded.

#### Test 10: Dashboard Totals Endpoint

Expected:

- Response contains cash, bank, and collected totals or documented current equivalent.
- Amounts are integer minor units where backend authority is enabled, or documented legacy values where not yet enabled.
- Response time is recorded.

#### Test 11: Arrears Modal

Expected:

- Modal opens.
- Outstanding items render.
- Modal closes cleanly.
- No horizontal overflow on mobile-width view.

#### Test 12: Search or Filter

Expected:

- Search/filter updates results.
- Clear filter restores baseline view.
- No unauthorized data appears.

### Group 3: Owner Read Operations

#### Test 13: Owner Dashboard Loads

Expected:

- Owner dashboard displays.
- Tenant summary is visible.
- No second login prompt appears after valid session.

#### Test 14: Owner Property Visibility

Expected:

- Owner sees all properties in own tenant.
- Owner does not see other tenants.

#### Test 15: Owner Totals

Expected:

- Owner totals endpoint or dashboard summary loads.
- Values are internally consistent.
- Latency is recorded.

#### Test 16: Owner History

Expected:

- Owner history loads.
- Pagination works where implemented.
- No cross-tenant row appears.

#### Test 17: Owner Arrears

Expected:

- Owner arrears view or modal loads.
- Compact WhatsApp export remains searchable by customer ID where available.
- No old category labels such as `重点` or `核对` appear in the export.

#### Test 18: Owner Reports

Expected:

- Read-only report view loads where available.
- Report data matches dashboard scope.

### Group 4: Readonly Admin

#### Test 19: Admin Dashboard

Expected:

- Admin dashboard loads.
- Readonly mode is clear.
- No write controls are visible.

#### Test 20: Admin Entries View

Expected:

- Entries list displays.
- Edit, delete, void, and save controls are absent or disabled.

#### Test 21: Admin Totals View

Expected:

- Admin can view totals within authorized scope.
- Admin cannot alter totals or settings.

#### Test 22: Admin History View

Expected:

- History view loads.
- Readonly state is preserved.
- Latency is recorded.

#### Test 23: Admin Audit View

Expected:

- Audit view loads if implemented.
- Actor, timestamp, and operation type are visible.
- Sensitive credentials are not visible.

#### Test 24: Admin Write Denial

Action:

1. Attempt a write API from admin session using a safe, non-production environment.
2. Do not run against production unless explicitly approved and guaranteed non-mutating.

Expected:

- Response is 403 or documented readonly denial.
- Data is not written.

### Group 5: Scope Isolation

#### Test 25: Employee Property Isolation

Expected:

- Employee sees only assigned property rows.
- Other property rows are absent.

#### Test 26: Owner Tenant Isolation

Expected:

- Owner sees own tenant rows.
- Other tenant rows are absent.

#### Test 27: Readonly Admin Scope

Expected:

- Admin visibility follows the configured readonly admin policy.
- Admin cannot write.

### Group 6: Performance and Stability

#### Test 28: System Availability

Expected:

- No unexpected restarts in the validation window.
- Health signal is green.

#### Test 29: Error Rate

Expected:

- 5xx rate is below 1 percent in the last hour.
- No repeated critical exception appears in logs.

#### Test 30: Database Connectivity

Expected:

- Read endpoints respond.
- No D1 connection timeout pattern appears.
- Response times are within expected baseline.

## Result Sheet Template

```text
Date:
Tester:
Environment:
Target URL:
Commit SHA:

Test # | Name | Status | Latency | Notes | Evidence
1 | Employee Login | PASS/FAIL | n/a | |
2 | Owner Login | PASS/FAIL | n/a | |
...
30 | Database Connectivity | PASS/FAIL | ms | |

Total pass:
Total fail:
Warnings:
Decision: GO / NO-GO
```

## Phase 0 Go/No-Go

Go:

- 30/30 tests pass, or 29/30 pass with no critical failure and explicit QA approval.
- No data leak.
- No auth blocker.
- No repeated 5xx errors.
- Performance is acceptable for starting implementation.

No-go:

- Any cross-tenant data exposure.
- Any admin write path succeeds.
- Any login path is blocked.
- Any critical read path is down.
- Error pattern suggests unstable environment.

## Troubleshooting

Login fails:

- Verify correct account alias.
- Confirm session/cookie behavior.
- Check `/api/me`.

Endpoint returns 404:

- Verify route path.
- Check whether feature is implemented or still planned.
- Compare against API inventory.

Unexpected 403:

- Verify user role and tenant/property assignment.
- Confirm frontend role tamper is not involved.

Slow response:

- Repeat 3 times.
- Record median and p95 where possible.
- Check logs and D1 query duration.

Data mismatch:

- Confirm the same environment is used.
- Refresh once.
- Capture request and response evidence.
- Escalate if mismatch persists.

## Completion Checklist

- All 30 tests executed.
- Results recorded.
- Failures include screenshot or log evidence.
- Latency recorded for performance-sensitive paths.
- Go/no-go decision made.
- Result shared with QA Lead, PM, and Engineering Lead.

# Quality Objectives and Success Criteria

Date: 2026-05-29

Purpose: define measurable success criteria for internal testing before any production release decision.

Owner: Engineering Lead and QA Lead.

Status: internal testing framework. Production remains `PRODUCTION_NO_GO`.

## 1. Functional Correctness

### 1.1 Money Precision

Requirement: exact integer-fils accuracy with zero tolerated variance.

Test scope:

- AED user input to backend minor-unit storage.
- Backend API response to frontend display.
- Add, void, refund, adjustment, receivable, handover, and export paths.
- Finance manual audit of at least 100 representative transactions.

Acceptance criteria:

- PASS: 100 percent of sampled transactions match exactly, with variance equal to 0 fils.
- FAIL: any discrepancy greater than 0 fils.

Evidence required:

- Round-trip table with input AED, expected fils, actual stored value, API value, and display value.
- Finance reviewer name and date.
- Link to failing transaction IDs if any mismatch exists.

### 1.2 Receivables State Machine

Requirement: every receivable state transition is valid, auditable, and reversible only through an approved path.

States under test:

- `CREATED`
- `PENDING`
- `PARTIAL`
- `PAID`
- `VOIDED`
- `ADJUSTED`
- `WRITTEN_OFF`

Acceptance criteria:

- PASS: all valid transitions work, all invalid transitions are rejected, and every transition writes ledger evidence.
- FAIL: any invalid transition is accepted, any ledger entry is missing, or any state is unrecoverable.

### 1.3 Tenant and Property Isolation

Requirement: zero cross-tenant and zero unauthorized cross-property data exposure.

Test scope:

- At least 3 tenants with overlapping customer and bed identifiers.
- Employee property restrictions.
- Owner same-tenant full visibility.
- Admin/read-only visibility constrained by tenant and property claims.

Acceptance criteria:

- PASS: all unauthorized data access attempts return 403, empty filtered results, or an equivalent denied response.
- FAIL: any response includes another tenant or unauthorized property row.

### 1.4 Handover Atomicity

Requirement: handover commits are all-or-nothing and idempotent.

Test scope:

- Normal 10-entry handover.
- Duplicate submission with the same idempotency key.
- Network failure during handover.
- Backend-calculated total mismatch.

Acceptance criteria:

- PASS: no partial handover remains, duplicate retry returns the same logical result, and mismatches roll back cleanly.
- FAIL: partial records, duplicate handovers, or orphaned entries exist.

### 1.5 Audit Trail Completeness

Requirement: every mutation is logged with actor, timestamp, old value, new value, operation type, and resource ID.

Test scope:

- Entry creation, edit, delete, and void.
- Payment creation and void.
- Handover.
- Receivable transitions.
- Deposit actions.
- Settings mutations.

Acceptance criteria:

- PASS: 100 percent of tested mutations have complete audit entries.
- FAIL: any mutation is missing audit evidence or required fields.

## 2. Reliability

### 2.1 Availability

Requirement: staging uptime of at least 99.9 percent during the internal validation window.

Acceptance criteria:

- PASS: downtime is less than 8.6 seconds over a 24-hour validation window.
- FAIL: downtime is equal to or greater than 8.6 seconds.

### 2.2 Error Rate

Requirement: error rate below 0.1 percent under representative load.

Acceptance criteria:

- PASS: no more than 1 error per 1000 requests.
- FAIL: error rate is equal to or greater than 0.1 percent.

### 2.3 Transaction Recovery

Requirement: failed transactions either fully roll back or can be retried idempotently.

Acceptance criteria:

- PASS: every injected failure recovers without data corruption.
- FAIL: any partial state remains after failure.

## 3. Performance

Baseline targets:

- `GET /api/history`: p95 below 500 ms for first page.
- `GET /api/arrears`: p95 below 300 ms.
- `GET /api/dashboard/totals`: p95 below 200 ms.
- Handover commit: p95 below 2 seconds.

Acceptance criteria:

- PASS: p95 latency is within baseline plus 20 percent.
- FAIL: p95 latency exceeds baseline plus 20 percent, or any endpoint exceeds 5 seconds.

## 4. Security and Authorization

Requirement: all role and scope decisions come from server-side auth claims and backend checks.

Acceptance criteria:

- PASS: all endpoint and UI permission combinations match the API permission matrix.
- FAIL: readonly admin can write, employee can access owner-only data, or frontend-supplied role/scope affects authorization.

## 5. Release Minimum Gate

Release cannot proceed unless all of the following are true:

- Functional correctness objectives pass.
- Reliability objectives pass.
- Performance objectives pass.
- Security objectives pass.
- Finance signs off money precision.
- QA signs off test execution.
- Engineering signs off implementation quality.
- Product signs off business completeness.
- Commercial launch gate no longer reports unapproved blockers through an explicit release decision.

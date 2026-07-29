# Risk Assessment and Mitigation Strategy

Date: 2026-05-29

Scope: internal testing and release readiness for Homelink production blockers.

Status: risk framework only. Production remains `PRODUCTION_NO_GO`.

## Executive Summary

This assessment tracks the highest-risk failure modes for the internal validation cycle. Critical risks must be mitigated before production approval. High and medium risks must have test evidence, owners, and rollback plans.

## Critical Risks

### Risk 1: Money Calculation Error

Impact: critical.

Probability: low if integer-fils rules are enforced.

Failure mode:

- AED decimal values enter calculation paths.
- Frontend and backend totals diverge.
- Rounding creates non-zero fils variance.

Mitigation:

- Store and calculate money only as integer fils.
- Reject unsafe floats, NaN, Infinity, and ambiguous decimals.
- Run finance audit on 100 representative transactions.
- Compare backend totals against expected fixture output.

Trigger:

- Any variance greater than 0 fils.

Response:

- Stop release validation.
- Identify affected route and transaction IDs.
- Fix conversion or calculation path.
- Re-run finance audit.

### Risk 2: Receivables State Corruption

Impact: critical.

Probability: medium due to state complexity.

Failure mode:

- Invalid transition accepted.
- Ledger missing.
- Payment allocation updates the wrong receivable.

Mitigation:

- Enforce a transition matrix in backend code.
- Wrap state changes in transactions.
- Write ledger rows for every state change.
- Test valid and invalid transitions.

Trigger:

- Invalid state, missing ledger, negative outstanding without approved adjustment.

Response:

- Disable receivables feature flag.
- Restore from backup or replay ledger if approved.
- Re-run state machine test suite.

### Risk 3: Cross-Tenant Data Leak

Impact: critical.

Probability: low if query scope is enforced centrally.

Failure mode:

- Query omits `tenant_id`.
- Employee sees unauthorized property data.
- Owner sees another tenant's rows.

Mitigation:

- Require tenant claim on every authenticated request.
- Filter list queries by tenant and allowed property IDs.
- Add access matrix tests with overlapping identifiers.
- Audit SELECT queries for missing scope predicates.

Trigger:

- Any unauthorized row returned.

Response:

- Stop validation.
- Disable tenant-scope switch.
- Audit logs for access exposure.
- Patch query and add regression test.

## High Risks

### Risk 4: Handover Partial Failure

Impact: high.

Probability: medium.

Mitigation:

- Use transaction boundaries for handover writes.
- Store idempotency result after successful commit.
- Reject total mismatches before commit.
- Inject failure at multiple handover steps.

Rollback:

- Disable handover atomicity flag.
- Restore affected rows from audit evidence or backup.

### Risk 5: Performance Regression

Impact: high.

Probability: medium.

Mitigation:

- Measure baseline before feature switch.
- Add required indexes before load tests.
- Use pagination for history and list endpoints.
- Monitor p95 latency and D1 query duration.

Rollback:

- Toggle feature flag off.
- Revert to old query path.

### Risk 6: Audit Trail Gap

Impact: high.

Probability: medium.

Mitigation:

- Maintain mutation endpoint inventory.
- Require audit call in every write handler.
- Test one successful and one failed mutation per endpoint.

Rollback:

- Do not roll forward to production until missing audit coverage is patched.

### Risk 7: Feature Flag Interference

Impact: high.

Probability: medium.

Mitigation:

- Keep old and new code paths explicit.
- Test flag false, flag true, and rollback for every feature.
- Avoid shared mutable state between paths.

Rollback:

- Toggle the affected feature flag off.
- Verify old path output matches baseline.

## Medium Risks

### Risk 8: Migration or Schema Drift

Impact: medium.

Mitigation:

- Use production-copy or staging only.
- Do not run production migrations during internal testing.
- Verify schema through read-only snapshots before applying any migration plan.

### Risk 9: Staging Instability

Impact: medium.

Mitigation:

- Monitor Worker health, D1 availability, and test data freshness.
- Keep rebuild and restore instructions documented.
- Track flaky tests separately from product defects.

### Risk 10: Team Context Loss

Impact: medium.

Mitigation:

- Assign owners to each test document.
- Keep decision records current.
- Pair on P0 implementation and validation tasks.

## Risk Review Cadence

Review weekly during internal testing:

- New risks.
- Triggered risks.
- Closed risks with evidence.
- Remaining no-go blockers.
- Owner and ETA for each open mitigation.

## Escalation Rules

Escalate immediately if:

- Any critical risk trigger occurs.
- Money variance is detected.
- Cross-tenant leak is detected.
- Partial handover is detected.
- Production credentials, secrets, or live D1 write risk is discovered.

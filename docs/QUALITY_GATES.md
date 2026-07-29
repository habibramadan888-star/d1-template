# Quality Gates

Date: 2026-05-29

Purpose: define go/no-go gates for internal testing phases and production readiness.

## Gate 0: Pre-Implementation

Required:

- Work happens on internal branch.
- Production remains `PRODUCTION_NO_GO`.
- No deploy.
- No production D1 write.
- No migration.
- Quality objectives reviewed.
- Risks assigned to owners.

No-go:

- Missing owner for a P0 risk.
- Finance has not reviewed money precision requirements.

## Gate 1: Code Complete

Required:

- Implementation compiles.
- Unit tests pass.
- Feature flags default off.
- Rollback method documented.
- Audit logging path defined for new mutations.

No-go:

- Feature path can run in production without explicit flag.
- Backend trusts frontend role, tenant, property, or total values.

## Gate 2: Readonly Staging

Required:

- Readonly endpoints pass.
- Backend totals shadow or candidate output verified.
- Tenant-scope readonly query behavior verified.
- Performance within baseline.

No-go:

- Readonly path mutates data.
- Query returns unauthorized rows.
- Dashboard totals differ without documented reason.

## Gate 3: Controlled Write Staging

Required:

- Receivable transitions pass.
- Handover atomicity passes.
- Audit trail coverage passes.
- Idempotency retry passes.
- Rollback rehearsal passes.

No-go:

- Partial handover.
- Missing audit entry.
- Invalid receivable state.
- Money variance.

## Gate 4: Failure Injection

Required:

- Network failure tests pass.
- Duplicate submission tests pass.
- Concurrent write tests pass.
- Feature flag rollback tests pass.

No-go:

- Data corruption.
- Unrecoverable transaction.
- Rollback exceeds accepted recovery target.

## Gate 5: Production-Copy Dry-Run

Required:

- Production-copy dry-run passes.
- Feature flags tested off and on.
- Finance manual audit passes.
- Performance baseline passes.
- Business sign-offs recorded.

No-go:

- Any P0 issue open.
- Any critical risk unmitigated.
- Any sign-off missing.

## Gate 6: Production Release Decision

Required:

- Engineering sign-off.
- QA sign-off.
- Finance sign-off.
- Product sign-off.
- Owner approval.
- Current commercial launch gate updated only through explicit approved release process.

No-go:

- `PRODUCTION_NO_GO` still has unresolved blockers.
- Rollback is not ready.
- Monitoring is not ready.
- On-call owner is not assigned.

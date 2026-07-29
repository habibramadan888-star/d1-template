# IMPL-004 Handover Atomicity Checklist

Generated: 2026-05-29
Scope: implementation handoff. No handover submit, no employee entry write, no D1 write.

## Current Evidence

| Area | Evidence | Status |
|---|---|---|
| Staging endpoint | `/api/staging/handover/commit` exists in Worker and is production-gated. | Present. |
| Idempotency | Checks idempotency key, request fingerprint, and duplicate accepted session. | Present in staging path. |
| Audit | Writes `handover_audit_events`, `entry_events`, and generic audit. | Present in staging path. |
| Tests | `tests/handover-atomic*.spec.mjs` and `tests/handover-staging-endpoint.spec.mjs` cover rehearsal behavior. | Strong coverage. |

## Required Production-Grade Behavior

- Accept only employee/staff scoped commit requests.
- Require idempotency key.
- Recompute backend totals from normalized rows.
- Reject frontend total mismatch.
- Commit parent row, child rows, idempotency row, and audit events atomically.
- Retry with same key returns same accepted result.
- Duplicate session with different key returns conflict.

## Implementation Steps

1. Keep current staging implementation production-disabled.
2. Add explicit production readiness gate for atomic batch semantics.
3. Confirm D1 `batch` semantics or use durable transaction-safe pattern.
4. Add production-copy dry-run with no live writes.
5. Define rollback from accepted staging commit if future promotion fails.

## Tests To Add Or Extend

- Same idempotency key replay returns same commit.
- Same payload with different key returns duplicate risk.
- Partial invalid row rejects whole commit.
- Unauthorized employee scope returns 403.
- Owner/readonly_admin cannot submit employee handover.
- Network retry does not duplicate financial result.

## Exit Criteria

| Item | Required |
|---|---|
| Atomic parent/rows/idempotency/audit write | Proven |
| Retry safety | Proven |
| Production feature flag | Off by default |
| Live handover write QA | Separate approval required |
| Production state | PRODUCTION_NO_GO until signed off |

# Handover Atomic Go-Live Gate

Generated: 2026-05-24, Asia/Dubai

Scope: future live switch checklist. P0-002B does not satisfy this gate because no live endpoint is wired.

## Required Before Live Switch

1. P0-001C minor-unit dual-write or equivalent money authority is complete.
2. P0-003 backend totals live authority is complete or feature-flagged after staging reconciliation.
3. P0-008 receivables model decision is complete for rent due, short pay, arrears repayment, and allocation.
4. P0-006 tenant/property scope is decided and enforced server-side.
5. Staging route `POST /api/employee/handover/commit` passes authenticated smoke tests.
6. Weak-network retry tests prove idempotency without duplicate financial rows.
7. Duplicate submit tests prove conflict/warning behavior.
8. Frontend total tamper tests prove backend recompute wins.
9. Voided-row tests prove old voided records cannot be recommitted.
10. Owner dashboard reconciliation proves handover totals match approved accounting definitions.
11. Audit events and entry events are immutable and queryable.
12. Rollback path is tested in staging.
13. Human approval is recorded before production deploy/migration.

## Required Verification Commands

| Command                            | Purpose                                              |
| ---------------------------------- | ---------------------------------------------------- |
| `npm run check`                    | Full local governance, static, tests, dry-run build. |
| `npm run verify:clean-d1`          | Empty local D1 bootstrap and core flows.             |
| `npm run test:money`               | AED fils helper guardrail.                           |
| `npm run test:backend-totals`      | Backend totals authority guardrail.                  |
| `npm run test:handover-atomic`     | Handover atomic module guardrail.                    |
| `npm run rehearse:handover-atomic` | Disposable local D1 rehearsal evidence.              |
| Authenticated staging smoke        | Owner/employee live route permission boundary.       |

## Rollback Criteria

Rollback or disable feature flag if:

1. Backend totals differ from approved staging reconciliation.
2. Duplicate submissions create more than one accepted commit.
3. Frontend total mismatch is not detected.
4. Audit events are missing.
5. Employee can submit outside assigned property.
6. Owner/admin can submit as employee.
7. Voided rows appear in active handover totals.

## Human Review Required

- Final API route name and response behavior.
- Whether frontend total mismatch rejects the handover or accepts with audit hold.
- Receivable generation policy for short-paid rent.
- Tenant/property membership model.
- Production migration and rollback scripts.

# IMPL-009 Rollback Strategy

Generated: 2026-05-29
Scope: rollback planning. No secret update, no deploy.

## Feature Flags

| Feature | Flag | Default |
|---|---|---|
| Backend totals authority | `BACKEND_TOTALS_AUTHORITY_ENABLED` | Off in production |
| Receivables state machine | `RECEIVABLES_STATE_MACHINE_ENABLED` | Off in production |
| Tenant/property query gate | `TENANT_ISOLATION_ENABLED` | Off in production |
| Runtime DDL strict mode | `SKIP_RUNTIME_DDL` or equivalent | Staging first |
| Audit trail expanded contract | `AUDIT_TRAIL_V2_ENABLED` | Off in production |

## Rollback Triggers

- Money precision mismatch.
- Cross-tenant data exposure.
- Readonly admin write succeeds.
- Handover duplicate or partial commit.
- API 500 error rate above threshold.
- History/dashboard latency exceeds safe threshold.

## Rollback Procedure

1. Turn off feature flag for the affected feature.
2. Confirm old code path responds successfully.
3. Run read-only smoke on auth, dashboard, history, arrears.
4. Preserve logs and audit evidence for investigation.
5. Do not delete or rewrite financial records without explicit approval.

## Data Recovery Notes

- Restoring production D1 requires explicit user approval and a separate runbook.
- Receivable state changes must be replayable from ledger/audit events.
- Handover idempotency rows must not be manually deleted without approval.

## Exit Criteria

| Item | Required |
|---|---|
| Feature flags defined | Yes |
| Rollback smoke checklist | Yes |
| No data deletion as rollback | Yes |
| Production state | PRODUCTION_NO_GO until signed off |

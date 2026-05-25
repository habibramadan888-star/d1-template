# Rollback Readiness Matrix

Generated: 2026-05-25T05:44:32.200Z

Scope: static rollback/readiness audit. This script reads reports only and does not deploy, migrate, call APIs, or access D1.

| Area                                | Risk   | Evidence Files                                                                                                                                          | Required Terms                                                   | Missing                            | Result          |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- | --------------- |
| Employee entry adapter route switch | P0-001 | `EMPLOYEE_ENTRY_ROUTE_SWITCH_ROLLBACK_RESULT.md`<br>`EMPLOYEE_ENTRY_ROLLBACK_DRILL_RESULT.md`<br>`P0_001K_CUTOVER_READINESS_CHECKLIST.md`               | `rollback`, `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE`, `legacy` | none                               | READY_DRAFT     |
| Handover staging endpoint           | P0-002 | `HANDOVER_ATOMIC_GO_LIVE_GATE.md`<br>`HANDOVER_STAGING_ENDPOINT_IMPLEMENTATION.md`<br>`P0_002D_GO_NO_GO_REVIEW.md`                                      | `rollback`, `feature flag`, `production`                         | none                               | READY_DRAFT     |
| Backend totals live authority       | P0-003 | `BACKEND_TOTALS_AUTHORITY_GATE.md`<br>`P0_003C_BACKEND_TOTALS_LIVE_AUTHORITY_GATE.md`                                                                   | `rollback`, `staging`, `dashboard`                               | none                               | READY_DRAFT     |
| Money minor-unit migration/backfill | P0-001 | `MONEY_DUAL_WRITE_READINESS_GATE.md`<br>`MONEY_RECONCILIATION_GATE.md`<br>`P0_001D_GO_NO_GO_CHECKLIST.md`                                               | `rollback`, `reconciliation`, `production`                       | MONEY_DUAL_WRITE_READINESS_GATE.md | BLOCKED         |
| Runtime DDL removal                 | P1-002 | `RUNTIME_DDL_MIGRATION_PLAN.md`<br>`P1_002B_RUNTIME_DDL_REMOVAL_READINESS.md`<br>`NEXT_PROMPT_P1_002C_RUNTIME_DDL_CONTROLLED_REMOVAL.md`                | `rollback`, `migration`, `production`                            | none                               | READY_DRAFT     |
| Embedded Worker artifact            | P1-006 | `EMBEDDED_WORKER_CONTROLLED_WRITE_PLAN.md`<br>`DEPLOY_ARTIFACT_GO_NO_GO_GATE.md`<br>`WORKER_DRIFT_CI_GATE_PLAN.md`                                      | `rollback`, `dry-run`, `deploy`                                  | none                               | READY_DRAFT     |
| Receivables implementation          | P0-008 | `RECEIVABLES_MODEL_DESIGN.md`<br>`P0_008B_RECEIVABLES_IMPLEMENTATION_READINESS_GATE.md`<br>`NEXT_PROMPT_P0_008C_RECEIVABLES_LOCAL_STAGING_REHEARSAL.md` | `rollback`, `migration`, `staging`                               | term:rollback                      | MANUAL_REQUIRED |
| Tenant/property scope               | P0-006 | `TENANCY_MIGRATION_PLAN.md`<br>`P0_006B_TENANT_PROPERTY_SCOPE_READINESS_GATE.md`<br>`NEXT_PROMPT_P0_006C_TENANT_SCOPE_LOCAL_STAGING_REHEARSAL.md`       | `rollback`, `migration`, `tenant`                                | none                               | READY_DRAFT     |
| Production deployment               | P1-010 | `PRODUCTION_DEPLOYMENT_SAFETY_CHECKLIST.md`<br>`ENVIRONMENT_SEPARATION_HARDENING_REVIEW.md`<br>`P0_001L_PRODUCTION_CUTOVER_NO_GO_REVIEW.md`             | `rollback`, `backup`, `production`                               | none                               | READY_DRAFT     |
| Observability and incident response | P1-009 | `OBSERVABILITY_AND_ERROR_MONITORING_PLAN.md`<br>`OBSERVABILITY_GO_NO_GO_CHECKLIST.md`                                                                   | `alert`, `retention`, `redaction`                                | none                               | READY_DRAFT     |

## Interpretation

- `READY_DRAFT` means rollback evidence exists at documentation/checklist level only; it is not production approval.
- `MANUAL_REQUIRED` means rollout/cutover must not proceed until the missing rollback terms are reviewed.
- `BLOCKED` means expected rollback evidence files are missing.

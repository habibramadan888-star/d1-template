# Knowledge Transfer Plan

Date: 2026-05-29

Purpose: ensure implementation, QA, DevOps, finance, and product share the same operational context.

## 1. Required Reading

All team leads:

- `docs/SYSTEM_AUDIT_REPORT.md`
- `docs/SYSTEM_AUTHORITY_MATRIX.md`
- `docs/QUALITY_OBJECTIVES.md`
- `docs/RISK_ASSESSMENT.md`
- `docs/QUALITY_GATES.md`

Backend:

- `docs/BACKEND_TOTALS_AUTHORITY_FINAL.md`
- `docs/RECEIVABLES_STATE_MACHINE_FINAL.md`
- `docs/TENANT_PROPERTY_ISOLATION_AUDIT.md`
- `docs/HANDOVER_ATOMICITY_VERIFICATION.md`
- `docs/AUDIT_TRAIL_COVERAGE_FINAL.md`

QA:

- `docs/TESTING_STRATEGY.md`
- `docs/MOBILE_QA_CHECKLIST.md`
- `docs/PERFORMANCE_VALIDATION.md`
- `docs/API_PERMISSION_MATRIX_FINAL.md`

DevOps:

- `docs/CHANGE_MANAGEMENT_PROCESS.md`
- `docs/DATA_MANAGEMENT.md`
- `docs/OBSERVABILITY_PLAN.md`
- `docs/IMPL_009_ROLLBACK_STRATEGY.md`
- `docs/IMPL_010_PRODUCTION_DRYRUN.md`

Finance and product:

- `docs/MONEY_PRECISION_FINAL_RECONCILIATION_REPORT.md`
- `docs/BACKEND_TOTALS_AUTHORITY_FINAL.md`
- `docs/RECEIVABLES_STATE_MACHINE_FINAL.md`

## 2. Handoff Sessions

Session 1: Architecture and authority.

- Owner: Engineering Lead.
- Audience: all leads.
- Output: confirmed ownership and open questions.

Session 2: Financial correctness.

- Owner: Finance Lead.
- Audience: backend, QA, product.
- Output: approved money and receivables test cases.

Session 3: Test execution.

- Owner: QA Lead.
- Audience: backend, DevOps.
- Output: confirmed test data and evidence format.

Session 4: Operations and rollback.

- Owner: DevOps Lead.
- Audience: all leads.
- Output: tested rollback runbook and escalation path.

## 3. Runbook Requirements

Each runbook must include:

- Purpose.
- Environment.
- Preconditions.
- Commands.
- Expected output.
- Failure handling.
- Rollback steps.
- Evidence location.

## 4. Decision Record Requirements

Record decisions for:

- Money storage and conversion.
- Receivables transitions.
- Tenant/property isolation.
- Handover idempotency.
- Audit retention.
- Feature flag rollout.

## 5. Onboarding Checklist

New contributor must be able to:

- Explain why production remains `PRODUCTION_NO_GO`.
- Identify the owner for each P0 blocker.
- Run local tests safely.
- Locate staging and production-copy runbooks.
- Explain the rollback trigger list.
- Avoid production D1 writes and deployments unless explicitly approved.

# Handover Atomic Migration Plan

Generated: 2026-05-24, Asia/Dubai

Scope: migration plan and SQL draft only. No active local bootstrap migration, production migration, remote D1 migration, or deployment was executed.

## Draft Tables

| Table                       | Purpose                                                        | Future Money Rule                                             | Dependencies                                      |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| `handover_commits`          | One backend-accepted employee handover batch.                  | Store backend and frontend totals in integer fils.            | P0-001C, P0-003 live switch, P0-006 tenant scope. |
| `handover_commit_rows`      | Row-level accepted/rejected handover items.                    | Store each amount as `amount_fils`.                           | P0-001C and P0-008 for receivable allocation.     |
| `handover_idempotency_keys` | Prevent duplicate weak-network commits.                        | No money authority.                                           | P0-002 live endpoint.                             |
| `handover_audit_events`     | Draft-specific audit trail or bridge to future `audit_events`. | Store totals/discrepancy as JSON plus fils columns on commit. | P1-001 unified audit model.                       |

## Required Fields

| Area        | Fields                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scope       | `company_id`, `property_id`, `employee_id`, `session_id`                                                                                                     |
| Idempotency | `idempotency_key`, `request_fingerprint`, `idempotency_status`                                                                                               |
| Totals      | `backend_cash_handover_fils`, `backend_bank_transfer_fils`, `backend_gross_received_fils`, `backend_session_total_fils`, `frontend_*_fils`, `delta_max_fils` |
| Lifecycle   | `status`, `submitted_at`, `accepted_at`, `rejected_at`, `voided_at`, `voided_by`                                                                             |
| Audit       | `created_at`, `created_by`, `updated_at`, `decision_reason`, `audit_payload_json`                                                                            |

## Why This Is Not Executed Tonight

1. Live money columns still need P0-001C dual-write decision.
2. Live backend totals switch needs P0-003 go-live gate.
3. Formal receivables/payment allocation needs P0-008 decision.
4. SaaS scope needs P0-006 tenant model decision.
5. Production D1 migration requires human approval, backup, staging rehearsal, and rollback plan.

## Local Verification Boundary

P0-002B uses `modules/finance/handover-atomic.mjs`, fixtures, unit tests, and disposable local rehearsal data. It does not add this draft to `migrations/local` and does not mutate production schema.

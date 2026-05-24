# Handover Atomic Migration Review

Generated: 2026-05-24, Asia/Dubai

Reviewed draft: `migration-drafts/handover_atomic_commit_draft.sql`

Scope: review only. The draft migration was not executed locally, remotely, or in production.

## Summary

The draft is directionally sound for a staging/local rehearsal because it separates commit batch, row detail, idempotency, and audit events. It already stores backend and frontend totals as integer fils and preserves lifecycle timestamps. It still needs naming and audit-scope decisions before any production migration.

## Table Review

| Table                       | Field                                    | Current Draft                                                    | Recommendation                                                                                                     | Risk   |
| --------------------------- | ---------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| `handover_commits`          | `commit_id`                              | `TEXT PRIMARY KEY`                                               | Accept. Use stable generated id.                                                                                   | Low    |
| `handover_commits`          | `company_id`                             | Present                                                          | Decide whether `company_id` is the canonical tenant id or add `tenant_id`. Do not keep ambiguous naming long term. | Medium |
| `handover_commits`          | `property_id`                            | Present                                                          | Accept. Required for property-level scope.                                                                         | Low    |
| `handover_commits`          | `employee_id`                            | Present                                                          | Accept. Must be tied to authenticated user, not request body only.                                                 | Medium |
| `handover_commits`          | `session_id`                             | Present with unique `(company_id, property_id, session_id)`      | Accept for one accepted handover per session; confirm whether void/retry needs a status-aware uniqueness rule.     | Medium |
| `handover_commits`          | `idempotency_key`                        | Present with unique `(company_id, property_id, idempotency_key)` | Accept. Consider including `employee_id` only if key generation is employee-scoped.                                | Low    |
| `handover_commits`          | `request_fingerprint`                    | Present                                                          | Accept. Must be canonicalized server-side.                                                                         | Low    |
| `handover_commits`          | `status`                                 | Present                                                          | Accept. Define enum: `ACCEPTED`, `REJECTED`, `IDEMPOTENT_REPLAY`, `DUPLICATE_WARNING`, `VOIDED`.                   | Low    |
| `handover_commits`          | `submitted_at`                           | Present                                                          | Accept. Use server-recorded time plus client submitted time if both are needed.                                    | Medium |
| `handover_commits`          | `accepted_at`, `rejected_at`             | Present                                                          | Add or alias `committed_at` for accepted accounting commit time, because review requirements explicitly need it.   | Medium |
| `handover_commits`          | backend total fields                     | Present as `*_fils`                                              | Accept. This supports future P0-001C direction.                                                                    | Low    |
| `handover_commits`          | frontend total fields                    | Present as `*_fils`                                              | Accept. Keep separate from backend totals.                                                                         | Low    |
| `handover_commits`          | `delta_max_fils`                         | Present                                                          | Add per-total delta fields or JSON summary so discrepancy review can identify exact mismatched field.              | Medium |
| `handover_commits`          | `bank_transfer_count`                    | Present                                                          | Add frontend bank transfer count if comparison is required.                                                        | Low    |
| `handover_commits`          | row counts                               | Present                                                          | Accept.                                                                                                            | Low    |
| `handover_commits`          | `audit_payload_json`                     | Present                                                          | Accept for staging, but future production should link to unified `audit_events`.                                   | Medium |
| `handover_commits`          | `voided_at`, `voided_by`                 | Present                                                          | Add `void_reason` and `void_source` to match void policy.                                                          | Medium |
| `handover_commits`          | `created_at`, `created_by`, `updated_at` | Present                                                          | Add `updated_by` if mutable staging status changes are allowed.                                                    | Low    |
| `handover_commit_rows`      | `row_id`                                 | `TEXT PRIMARY KEY`                                               | Accept.                                                                                                            | Low    |
| `handover_commit_rows`      | `commit_id`                              | Present                                                          | Add explicit index. Future production should define foreign key if D1 constraints are approved.                    | Medium |
| `handover_commit_rows`      | `client_entry_id`                        | Present with unique session scope                                | Accept. Add `row_index` for deterministic replay and display order.                                                | Low    |
| `handover_commit_rows`      | `amount_fils`                            | Present                                                          | Accept.                                                                                                            | Low    |
| `handover_commit_rows`      | `rejection_reason`                       | Present                                                          | Add structured `rejection_code` or JSON if multiple errors can exist.                                              | Medium |
| `handover_commit_rows`      | `normalized_payload_json`                | Present                                                          | Accept for audit, but avoid storing secrets or unnecessary PII.                                                    | Medium |
| `handover_idempotency_keys` | `request_fingerprint`                    | Present                                                          | Accept. Same key with changed fingerprint must conflict.                                                           | Low    |
| `handover_idempotency_keys` | `response_digest`                        | Present                                                          | Accept. Consider storing sanitized response snapshot for exact replay.                                             | Low    |
| `handover_audit_events`     | whole table                              | Present                                                          | Accept as draft bridge; future production should converge with unified audit events.                               | Medium |

## Missing Or Needs Review Before Production

1. `committed_at` or documented alias from `accepted_at`.
2. `void_reason` and `void_source`.
3. `updated_by` for any mutable statuses.
4. Per-total discrepancy details, not only `delta_max_fils`.
5. Clear tenant naming: `company_id` vs `tenant_id`.
6. Index plan for `commit_id`, `session_id`, `employee_id`, `submitted_at`, and audit query paths.
7. Foreign key policy for D1: enforce where safe or document logical relation.
8. Staging migration rollback script.

## Production Risk

| Risk               | Reason                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------- |
| P0-001C dependency | Draft stores fils, but live write paths still use legacy money.                              |
| P0-006 dependency  | `company_id`/`property_id` exist, but live tenant membership enforcement is not implemented. |
| P0-008 dependency  | Draft does not create receivables/payment allocations.                                       |
| P0-003 dependency  | Dashboard live authority still needs backend totals switch gate.                             |
| Audit dependency   | Draft audit table is not yet unified with existing `audit_logs` and `entry_events`.          |

## Recommendation

Approve the draft for local/staging review after the missing fields and index plan are addressed. Do not execute it in production. Do not include it in active production bootstrap until P0-001C, P0-006, P0-008, and P0-003 live gates are approved or explicitly scoped.

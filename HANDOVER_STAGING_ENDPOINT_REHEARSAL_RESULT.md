# Handover Staging Endpoint Rehearsal Result

Generated: 2026-05-24T22:01:01.050Z

Scope: P0-002C local/staging-only endpoint rehearsal. No production D1, remote D1, production Worker deploy, live employee handover switch, live dashboard change, or live financial formula change was performed.

| Scenario                    | Backend Result               | Frontend Total Status | Idempotency Status | Audit Plan                                        | Status            | Notes                                             |
| --------------------------- | ---------------------------- | --------------------- | ------------------ | ------------------------------------------------- | ----------------- | ------------------------------------------------- |
| valid employee submit       | 201 ACCEPTED                 | MATCH                 | NEW                | handover_commit_attempt, handover_commit_accepted | ACCEPTED          | Writes staging handover tables only.              |
| same idempotency key replay | 200 IDEMPOTENT_REPLAY        | n/a                   | IDEMPOTENT_REPLAY  | replay only                                       | IDEMPOTENT_REPLAY | Weak network retry did not create duplicate rows. |
| frontend totals tampered    | 422 FRONTEND_TOTALS_MISMATCH | MISMATCH              | not persisted      | handover.staging.frontend_totals_mismatch         | DISCREPANCY       | Staging policy rejects mismatch.                  |
| voided row                  | 422 VOIDED_REJECTED          | not authoritative     | not persisted      | handover.staging.voided_rejected                  | VOIDED_REJECTED   | Voided rows cannot be recommitted.                |

## Storage Verification

- handover_commits: 1
- handover_commit_rows: 2
- handover_idempotency_keys: 1
- audit_logs handover.staging.\*: 3
- entry_events handover_commit_accepted: 1
- legacy transactions: 0
- legacy deposit_ledger: 0
- legacy arrears: 0

## Result

P0-002 remains Partial because this endpoint is local/staging-only and the live employee handover flow is not switched.

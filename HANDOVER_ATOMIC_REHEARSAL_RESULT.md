# Handover Atomic Rehearsal Result

Generated: 2026-05-24T13:32:02.205Z

Scope: P0-002B local-only rehearsal. No production D1, remote D1, production Worker deploy, live employee handover route, live dashboard result, or live financial formula was changed.

| Scenario                            | Backend Result                                                             | Frontend Total Status | Idempotency Status | Audit Plan                                        | Status            | Notes                                               |
| ----------------------------------- | -------------------------------------------------------------------------- | --------------------- | ------------------ | ------------------------------------------------- | ----------------- | --------------------------------------------------- |
| valid-cash-only                     | ACCEPTED: cash 640.00 / bank 0.00 / gross 640.00 / session 640.00          | MATCH                 | NEW                | handover_commit_attempt, handover_commit_accepted | ACCEPTED          | Accepted cash handover..                            |
| duplicate-same-idempotency-key      | IDEMPOTENT_REPLAY: cash 640.00 / bank 0.00 / gross 640.00 / session 640.00 | MATCH                 | IDEMPOTENT_REPLAY  | handover_commit_attempt, handover_commit_rejected | IDEMPOTENT_REPLAY | Same key replay returns idempotent status..         |
| duplicate-different-idempotency-key | DUPLICATE_WARNING: cash 640.00 / bank 0.00 / gross 640.00 / session 640.00 | MATCH                 | DUPLICATE_WARNING  | handover_commit_attempt, handover_commit_rejected | DUPLICATE_WARNING | Same rows under a new key are flagged..             |
| weak-network-retry                  | IDEMPOTENT_REPLAY: cash 200.00 / bank 0.00 / gross 200.00 / session 200.00 | MATCH                 | IDEMPOTENT_REPLAY  | handover_commit_attempt, handover_commit_rejected | IDEMPOTENT_REPLAY | Weak-network retry does not plan duplicate writes.. |
| frontend-total-tampered             | DISCREPANCY: cash 640.00 / bank 0.00 / gross 640.00 / session 640.00       | MISMATCH              | NEW                | handover_commit_attempt, handover_commit_rejected | DISCREPANCY       | Tampered frontend totals produce discrepancy..      |
| voided-session-row                  | VOIDED_REJECTED: cash 0.00 / bank 0.00 / gross 0.00 / session 0.00         | MISMATCH              | NEW                | handover_commit_attempt, handover_commit_rejected | VOIDED_REJECTED   | Voided row is rejected..                            |
| invalid-money-3dp                   | INVALID_AMOUNT: cash 0.00 / bank 0.00 / gross 0.00 / session 0.00          | ERROR                 | NEW                | handover_commit_attempt, handover_commit_rejected | INVALID_AMOUNT    | Unsafe money is rejected..                          |
| unauthorized-employee-scope         | UNAUTHORIZED: cash 640.00 / bank 0.00 / gross 640.00 / session 640.00      | MATCH                 | NEW                | handover_commit_attempt, handover_commit_rejected | UNAUTHORIZED      | Employee scope mismatch is rejected..               |
| partial-upload-simulation           | REJECTED: cash 840.00 / bank 0.00 / gross 840.00 / session 840.00          | MATCH                 | NEW                | handover_commit_attempt, handover_commit_rejected | REJECTED          | Partial row count is rejected..                     |

## Local D1 Evidence

- Local D1 persist directory: disposable temp directory.
- Employees inserted: 1.
- Sessions inserted: 9.
- Transactions inserted: 10.
- Audit log rows inserted from plan: 18.
- Module used: `modules/finance/handover-atomic.mjs`.
- Backend totals helper used through the handover atomic module.
- Frontend totals are comparison input only.
- P0-002 remains Partial because no live Worker endpoint was wired.

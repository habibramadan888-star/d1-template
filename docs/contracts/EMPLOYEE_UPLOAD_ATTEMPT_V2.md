# Employee Upload Attempt V2

`employee_upload_attempt_v2` is the durable boundary for one-click Employee uploads.

## Identity and authority

- One `(company_scope, session_id, payload_hash)` has one durable attempt.
- The attempt is bound to the authenticated employee, artifact, accepted validation attestation, and ordered Entry ID set.
- The server owns saved, remaining, conflict, duplicate, and completion counts.
- Full payloads, credentials, cookies, access tokens, provider identity, and TTLock credentials are never persisted in attempt tables.

## State machine

`CREATED -> VALIDATED -> WRITING -> PAUSED_TRANSIENT -> WRITING -> VERIFYING -> FINALIZING -> COMPLETED`

Terminal controlled failures are `VALIDATION_FAILED`, `CONFLICTED`, and `FAILED_PERMANENT`. State may not move backward. A conditional D1 lease permits only one writer; an expired lease may be taken over safely.

## API behavior

- Start consumes one accepted aggregate-validation attestation and creates or returns the unique attempt.
- Next reconciles canonical truth, writes only a dependency-safe pending chunk through the existing seven-event handlers, then persists Entry-level progress.
- Status reconciles server truth after transport loss and returns authoritative counts.
- Finalize is allowed only after exact persistence, writes the authoritative Session summaries, and returns one stable receipt.
- Repeated start, next, status, or finalize calls never create a second canonical anchor.

The Employee page clears its draft only after `COMPLETED`, an exact receipt, zero missing/conflict/duplicate entries, and the expected formal-write count.

## Environment boundary

Migration `009_employee_upload_attempts.sql` is authorized for QA only in task 106H. Production migration, deployment, traffic, configuration, and business data remain unchanged.

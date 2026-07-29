# Arrears Follow-up Persisted State UI Deploy Approval Required

Date: 2026-06-01 Asia/Dubai

Deployment was not performed in this task.

If phone acceptance is required, deployment approval should be limited to:

- Employee follow-up persisted/dirty state UI copy.
- Owner assigned/followed-up task button state UI.
- Tests and documentation for the above.

Deployment must not include:

- Opening production write gate.
- Production business writes.
- Owner directive create.
- Employee follow-up write.
- Batch dispatch.
- TTLock smoke.
- Migration or D1 execute/export/import.
- Financial formula or dashboard calculation changes.

Production cutover must remain `PRODUCTION_NO_GO`.

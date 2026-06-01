# Employee System Reminder Count and Phone Hide Deploy Approval Required

Date: 2026-06-01

Default decision: not deployed in this task.

Allowed deployment scope if later approved:

- Employee FOLLOW-UP System Reminders count-source UI fix.
- Employee FOLLOW-UP display-title sanitizer hiding TTLock account phone identifiers.
- Tests and documentation only.

Not allowed:

- Production write gate changes.
- Production D1 writes.
- Employee follow-up writes.
- Owner directive creates.
- Batch dispatch.
- TTLock smoke.
- Migration or D1 execute/export/import.
- Financial formula or dashboard calculation changes.

Safety status:

| Item | Status |
|---|---|
| Production write | NO |
| Write gate | OFF |
| Migration | NO |
| Deploy | NOT_RUN |
| Production cutover | PRODUCTION_NO_GO |

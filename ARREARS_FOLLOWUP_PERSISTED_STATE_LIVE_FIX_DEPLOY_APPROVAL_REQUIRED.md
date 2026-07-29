# Arrears Follow-up Persisted State Live Fix Deploy Approval Required

Date: 2026-06-01 Asia/Dubai

## Reason

Read-only live audit concluded `LIVE_NOT_DEPLOYED`: the production Worker/static assets do not contain commit `223cbbb` persisted-state and owner-button-state markers.

## Approval Needed

A deployment is required only if Ramadan wants the phone-visible production UI to receive the already-committed fix.

Allowed deploy scope:

- Employee follow-up saved/dirty state UI model.
- Employee button copy for saved feedback vs unsaved edits.
- Owner assigned/followed-up task button state.
- Static UI / read-only asset update only.

Forbidden deploy scope:

- Opening production write gate.
- Production business write.
- Owner directive create.
- Employee follow-up write.
- Batch dispatch.
- TTLock smoke.
- Migration or D1 execute/export/import.
- Financial formula changes.
- Dashboard calculation changes.
- Production cutover.

## Required Post-Deploy Read-Only Smoke

1. Abdul employee FOLLOW-UP shows the saved `2026/06/10` feedback without a gate-off warning when unchanged.
2. Editing date or note changes the state to current changes unsubmitted.
3. With write gate off, only dirty/new submit attempts show the gate-off warning.
4. Owner followed-up task no longer shows clickable primary `下发员工`.
5. Write gate remains off.
6. Production cutover remains `PRODUCTION_NO_GO`.

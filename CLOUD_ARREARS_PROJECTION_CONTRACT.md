# Cloud Arrears Projection Contract

## Purpose

Cloud Arrears Projection is the fast read model for open historical arrears.

The source of truth is `sessions.entries_json` and the embedded ENTRY ANCHOR CONTRACT anchors. The projection is derived from active session anchors and can be rebuilt by all sessions, by one bed, or by one session.

## Source Rules

Only active sessions participate:

- `corpid` matches the current tenant.
- `voided_at` is empty.
- `handover_status` is not `VOID`.
- `entries_json` exists, or `export_text` contains the embedded anchor JSON block.

Voided or deleted sessions are excluded from projection.

## Projection Rules

Rent short-paid anchors create arrears:

- `event_type = rent`
- `short_paid = true`
- `arrears_amount > 0`

The generated projection item keeps:

- `arrears_ref`
- `bed`
- `source_session_id`
- `source_event_id`
- `original_date`
- `expected_amount`
- `paid_amount`
- `original_arrears_amount`
- `remaining_arrears`
- `due_date`
- `original_note`
- `status = open`

Arrears payment anchors settle by explicit reference only:

- `event_type = arrears_payment`
- `arrears_ref` exists
- `payment_amount > 0`

Duplicate rent rows or duplicate sessions never close arrears. Only matching `arrears_payment` anchors reduce `remaining_arrears` and move status to `partial` or `settled`.

Left With Arrears checkout anchors attach customer-left metadata to the referenced arrears item, including phone, belongings, promise dates, and deposit balance. They do not clear the debt.

## Runtime Functions

- `buildCloudArrearsProjectionFromSessions(sessions, opts)`
- `updateCloudArrearsProjectionForSession(env, user, sessionId, opts)`
- `rebuildCloudArrearsForBed(env, user, bed, opts)`
- `rebuildAllCloudArrears(env, user, opts)`
- `getOpenCloudArrearsForBed(env, user, bed, opts)`

## Read Paths

Employee arrears payment, checkout/deposit refund blocking, owner arrears views, and owner Overview Cloud Arrears read from the projection-aware resolver. Existing `arrear_tasks` remains a compatibility materialized index, but it is not the source of truth.

## Production Safety

This contract adds read-time projection and a read-only owner API:

- `GET /api/owner/cloud-arrears/projection`

No migration is required. No production rebuild write is executed by this task. Production cutover remains `PRODUCTION_NO_GO`.

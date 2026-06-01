# Bed Transfer Staging Fixture Setup Result

Date: 2026-06-01
Status: `NOT_EXECUTED_SCHEMA_BLOCKED`

No staging fixture was created because schema preflight failed before the fixture step.

| Fixture | Value |
|---|---|
| from_bed | not selected |
| to_bed | not selected |
| tenant/customer | not selected |
| deposit | not touched |
| rent period | not touched |
| arrears | not touched |
| TTLock old ref | not touched |
| TTLock new ref | not touched |
| rollback id/tag | not created |

Reason: staging lacks a dedicated `bed_transfer_events` table or equivalent event persistence contract. Creating a fixture without schema support would not validate deposit carry-over, arrears carry-over, TTLock trace, audit linkage, or statistical anchors.

Production write: no
Staging write: no
Production cutover: `PRODUCTION_NO_GO`

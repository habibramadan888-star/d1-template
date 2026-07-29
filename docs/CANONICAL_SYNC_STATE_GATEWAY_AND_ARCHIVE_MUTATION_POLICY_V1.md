# CANONICAL_SYNC_STATE_GATEWAY_AND_ARCHIVE_MUTATION_POLICY_V1

## Purpose

Employee browser state is draft/cache only. It cannot prove a record is synced.

`Synced` means the Canonical Event Archive currently confirms that the uploaded session and entry anchor exist and match the local record.

## Canonical Sync State Gateway

Gateway endpoint:

`POST /api/employee/entry/sync-state`

Input identifiers:

- `session_id`
- `anchor_id`
- `entry_id` / `event_id`
- `idempotency_key`
- canonical fingerprint when available

Output states:

- `SYNCED`
- `CLOUD_MISSING`
- `CLOUD_MISMATCH`
- `CLOUD_DELETED`
- `CLOUD_VOIDED`
- `CLOUD_CORRECTED`
- `NEEDS_RECONCILIATION`
- `READY_FOR_SERVER_VALIDATION`
- `VALIDATION_FAILED`
- `DRAFT`

Required proof fields:

- `cloud_match`
- `cloud_record_id`
- `matched_by`
- `archive_state`
- `source_proof`
- `allowed_next_action`

## Archive State Interpretation

| Archive State | Employee UI State | Allowed Next Action |
|---|---|---|
| `exists_active` | `SYNCED` only if entry/anchor matches | none |
| `missing` | `CLOUD_MISSING` | server validation required before any re-upload |
| `deleted` | `CLOUD_DELETED` | owner/admin review required |
| `voided` | `CLOUD_VOIDED` | owner/admin review required |
| `corrected` | `CLOUD_CORRECTED` or `NEEDS_RECONCILIATION` | owner/admin review required |
| `mismatch` | `CLOUD_MISMATCH` | owner/admin review required |
| `duplicate_found` | duplicate blocked | remove duplicate or owner review |
| `unknown` | `NEEDS_RECONCILIATION` | refresh/retry gateway, then owner review if unresolved |

## Enforcement Rules

1. Local `sync_status` / `upload_status` alone must never render green `Synced`.
2. Preview and WhatsApp Export must never mark a record as synced.
3. Real upload success may only move records to `CHECKING_CLOUD` until Sync State Gateway confirms.
4. WhatsApp Export is enabled only after every current-session entry is cloud-confirmed.
5. Upload must not be blocked solely because local cache says synced when the cloud archive is missing.
6. Active cloud duplicates remain blocked by duplicate guard.
7. Re-upload after `CLOUD_MISSING` must run server dry-run validation again.
8. Deleted, voided, corrected, or mismatched cloud records require owner/admin review before any recreate path.

## Archive Mutation Policy

Preferred production mutation:

`VOID_CORRECTION_REVERSAL`

Hard delete:

- allowed only for admin/test or legacy actions
- must become visible to Sync State Gateway as `CLOUD_MISSING` or `CLOUD_DELETED`
- must not leave employee local records green `Synced`

Preferred production actions:

- void
- correction anchor
- reversal anchor
- adjustment anchor

These preserve audit history and allow the Sync State Gateway to reconcile employee local cache against canonical cloud archive state.

## Production Data Policy

This document changes policy only. It does not modify production data and does not require migration.

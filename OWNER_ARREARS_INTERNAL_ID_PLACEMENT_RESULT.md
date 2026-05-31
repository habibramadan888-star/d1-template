# OWNER_ARREARS_INTERNAL_ID_PLACEMENT_RESULT

## Placement Policy

Internal identifiers are not business-facing fields and must not appear in the default arrears card list.

| Field            | Main Card | Detail         | Audit |
| ---------------- | --------- | -------------- | ----- |
| `task_id`        | no        | optional       | yes   |
| `source_ref`     | no        | optional       | yes   |
| `ttlock_card_id` | no        | optional       | yes   |
| `dedupe_key`     | no        | no/user hidden | yes   |

## Implementation Notes

- Main card title uses `bed` and `amount` only.
- Hidden checkbox values may still carry `taskId` for UI selection and API actions.
- Internal IDs are allowed only for developer diagnostics, details, or audit trails.
- No technical identifier is rendered in the default mobile card title or due/source line.

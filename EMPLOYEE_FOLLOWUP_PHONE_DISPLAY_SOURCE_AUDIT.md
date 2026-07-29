# Employee Follow-up Phone Display Source Audit

Date: 2026-06-01

Scope: employee System Reminders card titles. No data deletion or backend source mutation.

| Field / Source | Display Before | Root Cause | Required Fix |
|---|---|---|---|
| TTLock remark text | Could show `+971...` account identifiers in card title. | `followupTitle()` preferred `lock_remark` / `tenant_name` directly. | Sanitize employee display title before rendering. |
| `source_ref` | Not needed in employee default card. | Technical identifier, not task execution data. | Keep out of default card. |
| `ttlock_card` label | Not needed in employee default card. | Technical/source label, not business title. | Strip from display title if present. |
| Raw TTLock data | Must remain available for backend/audit/dedupe. | Needed for materialization and traceability. | Do not delete or mutate raw fields. |

Conclusion: the `+971...` values are display leakage from TTLock remark/account text. They should be hidden in employee card titles only.

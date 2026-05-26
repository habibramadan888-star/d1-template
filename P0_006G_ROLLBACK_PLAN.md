# P0-006G Rollback Plan

Date: 2026-05-26, Asia/Dubai

No migration, D1 write, feature flag, or live route/query change was executed in
P0-006G. Immediate rollback is therefore not required for this task.

| Area                         | Current State        | Rollback Action | Result |
| ---------------------------- | -------------------- | --------------- | ------ |
| Production deploy            | not executed         | none            | PASS   |
| Production migration         | not executed         | none            | PASS   |
| Production D1 write          | not executed         | none            | PASS   |
| Staging D1 write             | not executed         | none            | PASS   |
| Feature flag                 | not enabled remotely | keep disabled   | PASS   |
| Dashboard/history live query | unchanged            | none            | PASS   |
| Legacy CORPID fallback       | preserved            | none            | PASS   |
| Secrets                      | not touched          | none            | PASS   |

Future rollback for an actual staging backfill must include:

- staging D1 backup before write,
- generated reverse/update script or backup restore procedure,
- row-count comparison before and after rollback,
- dashboard/history diff after rollback,
- explicit confirmation that production was not touched.

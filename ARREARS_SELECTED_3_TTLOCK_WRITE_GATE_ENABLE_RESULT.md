# Selected 3 TTLock Write Gate Enable Result

Date: 2026-06-01, Asia/Dubai

Result: NOT RUN.

The write gate was not opened because readiness failed with `BLOCKED_TASK_ID_UNSTABLE`. The selected TTLock rows are virtual read-model rows and are not confirmed as persisted `arrear_tasks` rows accepted by the write endpoint.

| Check | Result |
|---|---|
| Write gate opened | no |
| Maximum open duration used | 0 minutes |
| Production D1 write | no |
| Production cutover | `PRODUCTION_NO_GO` |

# Arrears Directive Staging TTLock Owner Write QA Result

| Check | Result | Evidence |
| --- | --- | --- |
| owner create ttlock directive | PASS | status=200 |
| duplicate owner request prevented | PASS | replay=true |
| employee forbidden | PASS | boss directive API rejects staff role |
| readonly_admin forbidden | PASS | boss directive API rejects readonly write |
| production D1 write | NO | staging-only API and D1 target |

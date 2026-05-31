# Arrears Directive Owner Staging Write QA Result

| Check | Result | Evidence |
| --- | --- | --- |
| owner create directive | PASS | status=200, created=2 |
| duplicate prevented | PASS | status=200, replay=true |
| employee forbidden | PASS | status=403 |
| readonly_admin forbidden | PASS | status=403 |
| production D1 write | NO | staging-only target |

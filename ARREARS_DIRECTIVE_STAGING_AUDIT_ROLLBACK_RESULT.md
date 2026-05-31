# Arrears Directive Staging Audit Rollback Result

| Check | Result | Evidence |
| --- | --- | --- |
| owner idempotency key recorded | PASS | records=3 |
| employee followup idempotency keys recorded | PASS | records=3 |
| audit recorded | PASS | audit_rows=8 |
| rollback performed | PASS | restored=2 |
| production write | NO | staging D1 only |

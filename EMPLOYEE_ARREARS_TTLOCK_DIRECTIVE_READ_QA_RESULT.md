# Employee Arrears TTLock Directive Read QA Result

| Check | Result | Evidence |
| --- | --- | --- |
| assigned employee reads ttlock directive | PASS | status=200 |
| source label contract | PASS | source_type=ttlock_expired_unpaid maps to 通通锁到期未付 |
| system amount visible | PASS | amount_fils=63000 |
| no internal/debug fields | PASS | no source_ref/dedupe_key/ttlock_card in employee read model |
| other employee cannot read | PASS | not visible to other employee |

# STAGING-QA-005 Database Evidence

Generated: 2026-05-25T12:12:58.677Z

| Snapshot               | Table                     | Before Count | After Count | Expected Change | Result | Notes   |
| ---------------------- | ------------------------- | ------------ | ----------- | --------------- | ------ | ------- |
| employee valid write   | sessions                  | 0            | 1           | 1               | PASS   | delta=1 |
| employee valid write   | transactions              | 0            | 1           | 1               | PASS   | delta=1 |
| employee valid write   | audit_logs                | 0            | 2           | INCREASE        | PASS   | delta=2 |
| employee valid write   | entry_events              | 0            | 2           | INCREASE        | PASS   | delta=2 |
| employee invalid write | sessions                  | 1            | 1           | UNCHANGED       | PASS   | delta=0 |
| employee invalid write | transactions              | 1            | 1           | UNCHANGED       | PASS   | delta=0 |
| handover valid write   | handover_commits          | 0            | 1           | 1               | PASS   | delta=1 |
| handover valid write   | handover_commit_rows      | 0            | 2           | 2               | PASS   | delta=2 |
| handover valid write   | handover_idempotency_keys | 0            | 1           | 1               | PASS   | delta=1 |
| handover valid write   | transactions              | 1            | 1           | UNCHANGED       | PASS   | delta=0 |
| handover valid write   | deposit_ledger            | 0            | 0           | UNCHANGED       | PASS   | delta=0 |
| handover valid write   | arrears                   | 0            | 0           | UNCHANGED       | PASS   | delta=0 |
| handover valid write   | audit_logs                | 4            | 5           | INCREASE        | PASS   | delta=1 |
| handover valid write   | entry_events              | 4            | 5           | INCREASE        | PASS   | delta=1 |
| handover valid write   | handover_audit_events     | 0            | 1           | INCREASE        | PASS   | delta=1 |
| handover invalid write | handover_commits          | 1            | 1           | UNCHANGED       | PASS   | delta=0 |
| handover invalid write | handover_commit_rows      | 2            | 2           | UNCHANGED       | PASS   | delta=0 |
| handover invalid write | handover_idempotency_keys | 1            | 1           | UNCHANGED       | PASS   | delta=0 |

# DB Table Readiness Audit Result

Generated: 2026-05-25T05:44:31.009Z

| Metric                           | Count |
| -------------------------------- | ----: |
| Tables reviewed                  |    22 |
| BLOCKED tables                   |     0 |
| MANUAL_REQUIRED tables           |    10 |
| READY_DRAFT tables               |    12 |
| Tables with runtime DDL evidence |     8 |
| Tables with REAL risk            |     5 |
| Tables with \*\_fils fields      |    11 |

Overall: `MANUAL_REQUIRED`

Reasons:

- Legacy tables still contain `REAL` money fields.
- Tenant/property scope is not consistently represented.
- Runtime DDL still exists for several Worker-owned tables.
- Receivables and tenant tables are design/draft level, not production-applied.

No production deploy, migration, remote D1 access, or secret access was performed.

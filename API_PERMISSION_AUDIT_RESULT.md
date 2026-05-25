# API Permission Audit Result

Generated: 2026-05-25T05:31:55.999Z

| Metric               | Count |
| -------------------- | ----: |
| Total routes         |    29 |
| Public routes        |     4 |
| Auth-required routes |    25 |
| Financial routes     |    15 |
| Staging-only routes  |     2 |
| ANY-method routes    |     2 |
| Manual review routes |    25 |

Overall: `MANUAL_REQUIRED`

Reasons:

- Static route evidence cannot replace authenticated runtime role tests.
- Tenant scope remains `corpid` based for many routes.
- Financial routes still require P0-001/P0-003/P0-006/P0-008 completion before commercial launch.
- `ANY` method routes need method discipline review.

No production deploy, migration, remote D1 access, or secret access was performed.

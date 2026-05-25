# Audit Log Coverage Result

Generated: 2026-05-25T05:37:14.153Z

| Metric                       | Count |
| ---------------------------- | ----: |
| Routes reviewed              |    22 |
| Financial mutations reviewed |    12 |
| Static audit evidence routes |    11 |
| Manual review routes         |    11 |

Overall: `MANUAL_REQUIRED`

Reasons:

- Static audit evidence does not prove before/after completeness.
- Some financial or sensitive routes still need runtime audit-row assertions.
- A unified immutable audit event model is not live.

No production deploy, migration, remote D1 access, or secret access was performed.

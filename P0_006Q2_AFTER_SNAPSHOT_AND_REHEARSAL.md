# P0-006Q2 After Snapshot And Rehearsal

Date: 2026-05-26, Asia/Dubai

Target D1: `homelink-finance-staging`

## After Snapshot

| Table          | Rows Total | QA Evidence Rows Existing | Result |
| -------------- | ---------: | ------------------------: | ------ |
| `audit_logs`   |         12 |                         5 | PASS   |
| `entry_events` |         11 |                         6 | PASS   |

## Tenant Audit/Event Rehearsal

Command: `npm run rehearse:tenant-audit-events`

| Check                             | Result |
| --------------------------------- | ------ |
| Overall rehearsal                 | PASS   |
| Total scenarios                   | 18     |
| PASS count                        | 17     |
| NEEDS_STAGING_EVIDENCE_DATA count | 0      |
| FAIL count                        | 0      |
| Missing coverage count            | 0      |
| `audit_logs` result               | PASS   |
| `entry_events` result             | PASS   |

Required evidence now available:

- `audit_logs` owner-created evidence rows exist.
- `audit_logs` scoped `session.void` evidence row exists.
- `entry_events` scoped `session_void` evidence row exists.
- Scope fields are present for tenant/property/employee/owner/corp where schema
  supports them.
- Cross-tenant and cross-property scenarios are filtered/denied in rehearsal
  policy.
- Legacy CORPID fallback remains warning-only.

Safety:

- Production D1 write: no.
- Production deploy/migration: no.
- Dashboard/live financial formula mutation: no.
- Business table write: no.

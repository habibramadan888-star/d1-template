# P0-006Q2 Seed Script Result

Generated: 2026-05-26T15:44:32.081Z

Mode: `write`
Target D1: `homelink-finance-staging`
Target D1 ID: `4ff78bfc-3855-436b-aefb-6b492145d79c`
Commercial launch gate: `PRODUCTION_NO_GO`
QA run id: `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26`
Source marker: `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE`

| Table        | Planned | Existing Before | Existing After | Inserted | Result |
| ------------ | ------- | --------------- | -------------- | -------- | ------ |
| audit_logs   | 5       | 0               | 5              | 5        | PASS   |
| entry_events | 6       | 0               | 6              | 6        | PASS   |

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging target: homelink-finance-staging only.
- Business tables written: no.
- Tables eligible for insert: audit_logs, entry_events.
- Secrets/passwords/tokens/cookies printed: no.

Write result: staging-only QA evidence rows were inserted or skipped idempotently when they already existed.

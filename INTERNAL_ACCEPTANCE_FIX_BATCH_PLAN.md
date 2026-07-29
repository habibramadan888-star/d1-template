# Internal Acceptance Fix Batch Plan

Generated: 2026-06-01 Asia/Dubai

Production cutover status: `PRODUCTION_NO_GO`

## Batch Rules

1. P0 issues are fixed immediately and individually.
2. P1 issues are grouped by module and fixed in focused batches.
3. P2/P3 issues enter UX polish batches.
4. Different modules must not be mixed in one fix unless the root cause is shared and documented.
5. Every fix batch must include tests or explicit manual acceptance steps.
6. Every fix batch defaults to no production write.
7. Anything involving production write gate requires separate approval.
8. Anything involving migration requires separate approval.
9. Every batch ends with a mobile acceptance checklist.

## Recommended Batch Types

| Batch | Scope | Allowed By Default | Requires Separate Approval |
|---|---|---|---|
| P0 Auth / Permission | Login, logout, role guard, readonly boundary | code/tests/docs | production write, secrets change |
| P1 Owner Arrears | owner arrears read UI, WhatsApp export, feedback visibility | UI/read-only API tests | owner directive write, batch dispatch |
| P1 Employee Follow-up | employee inbox read UI, saved/dirty copy | UI/read-only tests | employee follow-up write |
| P1 Navigation / Modules | owner nav, history, analysis, customer, network | UI/tests/docs | deploy if not approved |
| P2 Mobile UX | card layout, text density, labels, spacing | UI/tests/docs | business logic changes |
| P3 Visual Polish | icon, color, micro-copy | UI/tests/docs | none unless touching auth/write |

## Batch Exit Criteria

- Targeted tests pass.
- `npm run security:secrets` passes.
- `npm run gate:commercial-launch` remains `PRODUCTION_NO_GO`.
- No unintended D1 write, migration, deploy, or write gate opening.
- Mobile acceptance checklist generated for affected role/page.

# NEXT PROMPT: Retry Existing Arrears Production Smoke After Route Deploy

Enter `TASK ARREARS-DIRECTIVE-PRODUCTION-EXISTING-ARREARS-SMOKE-RETRY-AFTER-ROUTE-DEPLOY-001`.

Current state:

- Previous production-linked smoke was `BLOCKED` because `POST /api/boss/arrears/directives` returned 404.
- Route deploy is now complete.
- Worker version id: `86365492-e47e-499a-95ee-960b46acb976`.
- `POST /api/boss/arrears/directives` now returns `409 production_write_approval_required` while write gate is off.
- `GET /api/employee/arrears/directives` returns `200 success`.
- `POST /api/employee/arrears/directives/:id/followup` returns `409 production_write_approval_required` while write gate is off.
- `readonly_admin` write attempt returns `403 forbidden`.
- No production write gate is currently enabled.
- No production D1 execute/export/import was run in the route deploy verification.
- No directive or employee follow-up was created in the route deploy verification.
- Production cutover remains `PRODUCTION_NO_GO`.

Before retrying smoke, perform these checks:

1. Re-confirm production write gate is off.
2. Re-confirm selected task is still safe.
3. Re-confirm masked auth works for owner / employee / readonly_admin.
4. Re-confirm no idempotency conflict exists for the planned owner and employee keys.
5. Re-confirm the selected task remains an `existing_arrears_record`.
6. Re-confirm amount and actual_received are unchanged.

If Ramadan explicitly approves:

1. Temporarily enable the production write gate.
2. Execute exactly one `existing_arrears_record` smoke for the approved task.
3. Execute owner directive create once.
4. Execute owner idempotency replay once.
5. Execute employee read once.
6. Execute employee follow-up once.
7. Execute employee idempotency replay once.
8. Verify owner feedback visibility.
9. Verify readonly_admin write rejection.
10. Immediately disable the production write gate.
11. Restore/cleanup only the selected task as approved.
12. Record post-smoke verification.

Strict exclusions:

- Do not do ttlock smoke.
- Do not do batch write.
- Do not do production cutover.
- Do not modify financial formula.
- Do not modify dashboard calculation.
- Do not print password/token/cookie/Set-Cookie.
- Do not mark commercial launch as GO.

Production cutover must remain `PRODUCTION_NO_GO`.

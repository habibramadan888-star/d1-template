# TASK P0-001J: Employee Entry Live Route Switch Rehearsal

Use this prompt only after human approval of P0-001I.

Current prerequisite:

- P0-001H completed with `POST /api/staging/employee-entry/adapter-draft`.
- P0-001I live route cutover gate completed.

Goal:

Implement a local/staging-only rehearsal for adapting `POST /api/employee/entry` behind a feature flag, without changing production behavior.

Strict limits:

1. Do not deploy production.
2. Do not deploy staging.
3. Do not execute production D1 migration.
4. Do not execute remote D1 migration.
5. Do not modify production wrangler config.
6. Do not delete legacy fields.
7. Do not switch dashboard/history live authority.
8. Do not switch handover live flow.
9. Do not change production `/api/employee/entry` behavior.
10. Do not hard-code secrets.
11. Do not bypass auth.
12. Do not treat frontend totals as authority.

Required behavior:

1. Add feature flag `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true`.
2. The flag must work only when `APP_ENV` is `development`, `dev`, `local`, `test`, or `staging`.
3. Production must remain on the current legacy behavior.
4. When enabled locally, adapter pre-validation must run before legacy write.
5. Invalid adapter draft must reject before write.
6. Valid adapter draft may continue into the current legacy write path for rehearsal only.
7. The route must log audit evidence that adapter pre-validation ran.
8. The route must not change dashboard output unless separately approved.
9. Rollback by disabling the feature flag must be tested.

Required files:

- `tests/employee-entry-live-route-cutover.spec.mjs`
- `scripts/rehearse-employee-entry-live-route-cutover.mjs`
- `EMPLOYEE_ENTRY_LIVE_ROUTE_CUTOVER_REHEARSAL_RESULT.md`
- update `RUN_REPORT.md`
- update `VERIFICATION_STATUS.md`
- update `P0_P1_STATUS_REVIEW.md`
- update `COMMERCIALIZATION_BACKLOG.md`

Required validation:

```text
npm run check
npm run smoke:with-worker
npm run verify:clean-d1
npm run test:employee-entry-live-write-adapter
npm run test:employee-entry-adapter-staging-endpoint
npm run rehearse:employee-entry-adapter-staging-endpoint
npm run test:employee-entry-live-route-cutover
npm run rehearse:employee-entry-live-route-cutover
npm run security:secrets
```

P0-001 status after this task:

`Partial - local/staging employee entry live route switch rehearsal passed`

Do not mark P0-001 Verified.

# TASK P0-001G: Local/Staging Live Write Adapter Rehearsal

Use this prompt only after reviewing P0-001F outputs:

- `MONEY_LIVE_WRITE_PATH_AUDIT.md`
- `MONEY_LIVE_WRITE_PATH_AUDIT_RESULT.md`
- `P0_001F_LIVE_WRITE_PATH_SWITCH_GATE.md`
- `MONEY_LIVE_WRITE_SWITCH_TEST_PLAN.md`

## Goal

Implement a local/staging-only rehearsal for live money write adapters, starting with `/api/employee/entry`, without wiring the adapter into the live route.

## Strict Limits

1. Do not switch `/api/employee/entry` live behavior.
2. Do not switch `/api/save_session` live behavior.
3. Do not change live dashboard or history results.
4. Do not execute production migration.
5. Do not execute remote D1 migration.
6. Do not deploy staging or production.
7. Do not delete legacy decimal/REAL fields.
8. Do not change live financial formulas.
9. Do not treat frontend totals as accounting authority.
10. Do not mark P0-001 Verified.

## Required Work

1. Create a non-invasive adapter module for employee entry money writes.
2. The adapter must output:
   - legacy fields for compatibility,
   - `*_fils` patch fields,
   - backend-computed totals where applicable,
   - warnings,
   - errors,
   - audit plan.
3. Cover:
   - rent full payment,
   - rent short payment,
   - deposit collection,
   - deposit refund,
   - checkout deduction,
   - arrears payment,
   - invalid three-decimal input,
   - empty required money,
   - legacy number source warning,
   - voided row exclusion.
4. Add fixtures and tests.
5. Add a local/staging rehearsal script using disposable local D1 only.
6. Update reports and backlog.

## Required Commands

Run at minimum:

```powershell
npm run check
npm run audit:money-live-writes
npm run test:money
npm run test:money-dual-write
npm run test:money-dual-write-local-staging
npm run rehearse:money-dual-write-local-staging
npm run security:secrets
```

## Expected Status

Set P0-001 to:

`Partial - local/staging live write adapter rehearsal ready`

Do not use:

- `Verified`
- `Fixed`
- `Done`

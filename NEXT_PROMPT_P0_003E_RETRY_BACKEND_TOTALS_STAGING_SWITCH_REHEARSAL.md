# NEXT PROMPT: P0-003E Retry Backend Totals Staging Switch Rehearsal

Use this prompt only after FORMAT-REBASELINE-001.

Current status:

- P0-003D is complete.
- P0-003E initial baseline was blocked by Prettier drift in generated reports.
- FORMAT-REBASELINE-001 resolved the formatting blocker.
- `npm run format:check` passed.
- `npm run check` passed with 193 tests.
- `npm run security:secrets` passed.
- `npm run gate:commercial-launch` returned `PRODUCTION_NO_GO`.

Enter TASK P0-003E-RETRY: Backend totals staging switch rehearsal.

Goals:

1. Retry the P0-003E baseline from
   `qa/p0-003e-backend-totals-staging-switch-rehearsal`.
2. Execute backend totals authority staging/local switch rehearsal only if the
   full baseline passes.
3. Confirm `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING` behavior:
   - production always disabled
   - flag off uses legacy behavior
   - staging/local/test flag on enables backend totals staging mode
4. Switch only approved staging candidate totals:
   - cash total
   - bank transfer total / count
   - gross received
   - rent received
   - handover totals
   - session totals
   - voided records exclusion
   - active records totals
5. Keep blocked totals legacy or shadow-only:
   - today due
   - overdue amount
   - arrears total
   - deposit total
   - arrears paid / outstanding
   - dashboard monthly income
   - history row totals
6. Record dashboard/history evidence and legacy-vs-backend deltas.
7. Roll back `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING=false` after QA.
8. Keep `gate:commercial-launch` at `PRODUCTION_NO_GO`.

Strictly forbidden:

1. No production deploy.
2. No staging deploy unless explicitly required by a staging-only rehearsal plan
   and separately approved.
3. No production migration.
4. No remote production D1 migration.
5. No production D1 write.
6. No production URL call.
7. No production feature flag enablement.
8. No production dashboard/totals switch.
9. No P0-003 `Verified`, `Done`, or `Fixed` status.
10. No P0-008 receivables implementation.
11. No P0-006 tenant/property scope implementation.
12. No secret, password, token, or cookie commit/logging.
13. Do not submit success if rollback fails.

Required verification:

```bash
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run test:backend-totals
npm run rehearse:backend-totals
npm run test:backend-totals-staging-gate
npm run test:backend-totals-staging-switch
npm run compare:staging-backend-totals
npm run rehearse:backend-totals-staging-switch
npm run qa:employee-entry-staging
npm run audit:worker-drift
npm run verify:embedded-worker
npm run build:embedded:dry-run
```

`npm run qa:employee-entry-staging` must run without confirmation flags and
remain `DRY_RUN_ONLY` / `MANUAL_REQUIRED`.

P0-003 status after retry can only be:

- `Partial - backend totals staging switch rehearsal passed`
- `Partial - backend totals staging switch rehearsal blocked`

Production cutover remains `NO-GO`.

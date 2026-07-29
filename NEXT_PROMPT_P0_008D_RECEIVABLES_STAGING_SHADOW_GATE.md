# NEXT PROMPT: P0-008D Receivables Staging Shadow Gate

Enter TASK P0-008D: Receivables staging shadow gate.

Current prerequisite:

- P0-008C local/staging rehearsal passed.
- `modules/finance/receivables.mjs` is pure and non-invasive.
- `npm run test:receivables` passes.
- `npm run rehearse:receivables` passes in dry-run mode.
- Production cutover remains `NO-GO`.

Strictly forbidden:

1. Do not execute production deploy.
2. Do not execute production migration.
3. Do not execute remote production D1 migration.
4. Do not write production D1.
5. Do not call production URL.
6. Do not make receivables production authority.
7. Do not change live dashboard result.
8. Do not change live financial formula.
9. Do not mark P0-008 Verified.
10. Do not submit secrets, passwords, tokens, or cookies.

Allowed:

1. Local/staging only.
2. Feature-flagged shadow mode only.
3. Read staging data for comparison.
4. If staging write is required, require explicit approval, backup, rollback, and a staging-only target.
5. Keep dashboard unchanged unless a staging shadow metadata mode is explicitly approved.
6. Generate reconciliation and dashboard evidence.
7. Keep `gate:commercial-launch` as `PRODUCTION_NO_GO`.

Required outputs:

1. `P0_008D_RECEIVABLES_STAGING_SHADOW_CONTEXT.md`
2. `RECEIVABLES_STAGING_SHADOW_RESULT.md`
3. `RECEIVABLES_LEGACY_ARREARS_RECONCILIATION_RESULT.md`
4. `RECEIVABLES_DASHBOARD_SHADOW_EVIDENCE.md`
5. `RECEIVABLES_STAGING_SHADOW_ROLLBACK_PLAN.md`

P0-008 status may only become:

- `Partial - receivables staging shadow gate ready`
- `Partial - receivables staging shadow gate blocked`

Production cutover must remain `NO-GO`.

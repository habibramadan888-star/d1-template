# NEXT PROMPT: STAGING-QA-005B Enable Staging Flags And Execute Real Write QA

Use only after human approval.

Task: enable staging-only feature flags for real staging write QA, execute employee entry and handover staging write tests, then rollback both flags to false.

Target staging resources:

- Worker: `homelink-finance-staging`
- URL: `https://homelink-finance-staging.habibramadan888.workers.dev`
- D1: `homelink-finance-staging`
- D1 ID: `4ff78bfc-3855-436b-aefb-6b492145d79c`

Required human approvals:

1. Approve a staging-only runtime config change or staging deploy that sets:
   - `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true`
   - `ENABLE_HANDOVER_ATOMIC_STAGING=true`
2. Approve real staging write QA with:
   - `--confirm-staging-write`
   - `--confirm-backup`
   - `--confirm-rollback`
3. Approve rollback after tests by setting both flags back to `false`.

Strictly forbidden:

1. No production deploy.
2. No production migration.
3. No remote production D1 migration.
4. No production URL calls.
5. No production D1 writes.
6. No production feature flags.
7. No secret or password output.
8. No production cutover.
9. Do not mark P0-001 or P0-002 Verified.

Execution requirements:

1. Confirm `gate:commercial-launch = PRODUCTION_NO_GO`.
2. Confirm target D1 name/id before writes.
3. Confirm backup exists before writes.
4. Enable staging flags only in the staging environment.
5. Execute employee entry real staging QA.
6. Execute handover staging endpoint real staging QA.
7. Capture before/after database counts.
8. Capture dashboard/history evidence.
9. Capture audit evidence.
10. Roll back both staging flags to `false`.
11. Verify endpoints are disabled/protected after rollback.
12. Run final safety checks.

Expected output files:

- `EMPLOYEE_ENTRY_REAL_STAGING_QA_RESULT.md`
- `HANDOVER_REAL_STAGING_QA_RESULT.md`
- `STAGING_QA_005_DATABASE_EVIDENCE.md`
- `STAGING_QA_005_OWNER_FLOW_EVIDENCE.md`
- `STAGING_QA_005_ROLLBACK_RESULT.md`
- `STAGING_QA_005_COMMERCIAL_LAUNCH_GATE_RESULT.md`

# NEXT PROMPT: P0-006J Tenant Scope Staging Verification

Enter TASK P0-006J: Tenant scope staging verification after approved
compatibility-column backfill.

Current status:

- P0-006I2 completed with staging-only backfill write against
  `homelink-finance-staging`.
- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Staging backfill write: yes, approved compatibility scope columns only.
- P0-006 remains Partial.
- Production cutover remains NO-GO.

Target:

- Worker / D1 scope: staging only.
- D1 name: `homelink-finance-staging`.
- D1 id: `4ff78bfc-3855-436b-aefb-6b492145d79c`.

Required verification:

1. Verify scoped staging data in `sessions`, `transactions`, `entry_events`,
   and `audit_logs`.
2. Verify no cross-tenant leakage in local/staging query policy fixtures.
3. Verify employee and owner access scope remains denied unless explicitly
   authorized by company/property scope.
4. Verify manual-required rows remain untouched.
5. Verify legacy `corpid` fallback was preserved.
6. Verify financial amount fields were not changed.
7. Verify dashboard/history behavior remains unchanged unless a staging-only
   gate explicitly opts into scoped query mode.
8. Verify `npm run gate:commercial-launch` remains `PRODUCTION_NO_GO`.

Strictly forbidden:

1. No production deploy.
2. No production migration.
3. No remote production D1 migration.
4. No production D1 write.
5. No production URL call.
6. No production feature flag enablement.
7. No staging schema migration.
8. No staging row-level backfill write.
9. No deletion of legacy `corpid` fields.
10. No deletion of legacy tables.
11. No dashboard live switch.
12. No live financial formula change.
13. Do not mark P0-006 Verified.
14. Do not mark production cutover GO.
15. Do not commit secrets.

Expected output:

- `P0_006J_TENANT_SCOPE_STAGING_VERIFICATION_RESULT.md`
- `P0_006J_CROSS_TENANT_LEAKAGE_REVIEW.md`
- `P0_006J_EMPLOYEE_OWNER_ACCESS_SCOPE_REVIEW.md`
- `P0_006J_PRODUCTION_NO_GO_REVIEW.md`
- Updated status reports with P0-006 still Partial.

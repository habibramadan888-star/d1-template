# NEXT PROMPT: P0-006R Tenant Scope Production Readiness Gate

Enter TASK P0-006R: Tenant scope production readiness gate.

Current prerequisite:

- P0-006Q2 staging-only audit/event QA evidence rows were created and verified.
- `audit_logs` result: PASS.
- `entry_events` result: PASS.
- Missing coverage count: 0.
- P0-006 remains Partial.
- Production cutover remains `NO-GO`.

Strict requirements:

1. Staging/local review only unless separate explicit production approval is
   provided.
2. Do not execute production deploy.
3. Do not execute production migration.
4. Do not write production D1.
5. Do not call production URL.
6. Do not remove legacy CORPID fallback.
7. Do not mark P0-006 Verified.
8. Do not mark production cutover GO.
9. Review tenant scope production readiness only as a gate.
10. Confirm `gate:commercial-launch` remains `PRODUCTION_NO_GO`.

Required review:

1. Confirm P0-006A through P0-006Q2 evidence chain.
2. Confirm staging schema/backfill/route/query/auth/access/audit-event evidence.
3. Identify remaining production blockers.
4. Identify production migration/backfill requirements.
5. Identify production rollback requirements.
6. Identify human approvals needed before any production action.

Expected output:

- `P0_006R_TENANT_SCOPE_PRODUCTION_READINESS_GATE.md`
- Updated status reports with P0-006 still Partial.
- Production cutover remains `NO-GO`.

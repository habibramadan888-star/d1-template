# NEXT PROMPT: P0-006S Tenant Scope Production Approval Packet

Enter TASK P0-006S: Tenant scope production approval packet, manual-required.

Current prerequisite:

- P0-006R production readiness gate was reviewed.
- P0-006 remains Partial.
- Production cutover remains `NO-GO`.

Scope:

Create a human approval packet only. Do not execute production.

Strictly forbidden:

1. No production deploy.
2. No production migration.
3. No remote production D1 migration.
4. No production D1 write.
5. No production URL call.
6. No production feature flag enablement.
7. No production cutover.
8. Do not remove legacy CORPID fallback.
9. Do not mark P0-006 Verified.
10. Do not mark production cutover GO.

Required packet sections:

1. Production D1 target confirmation requirements.
2. Production backup requirements.
3. Production schema migration approval checklist.
4. Production row-level backfill approval checklist.
5. Production rollback checklist.
6. Auth/session claim production switch checklist.
7. Route/query production switch checklist.
8. Legacy CORPID fallback policy.
9. Accounting/data review requirements.
10. Explicit human approval flags required before any production action.

Expected output:

- `P0_006S_TENANT_SCOPE_PRODUCTION_APPROVAL_PACKET.md`
- Updated status reports with P0-006 still Partial.
- `gate:commercial-launch` remains `PRODUCTION_NO_GO`.

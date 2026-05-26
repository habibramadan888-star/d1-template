# Tenant Scope Backfill Reconciliation Result

Generated: 2026-05-26T06:18:24.846Z

Scope: staging/local-only tenant scope backfill reconciliation using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.

Overall: `PASS`

| Source Row      | Table        | Legacy CORPID | Bed | CID        | Candidate Company | Candidate Property | Mapping Status | Collision Risk                                     | Result | Notes                                                                                         |
| --------------- | ------------ | ------------- | --- | ---------- | ----------------- | ------------------ | -------------- | -------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| session_a_1     | sessions     | homelink      | 101 | CID-SHARED | company_a         | property_a_1       | MAPPABLE       | COLLISION_RESOLVED_BY_CANONICAL_SCOPE: arrear_b_1  | PASS   | Canonical company/property mapping exists; do not mutate live rows without approved backfill. |
| transaction_a_2 | transactions | homelink      | 205 | CID-A2     | company_a         | property_a_2       | MAPPABLE       | none                                               | PASS   | Canonical company/property mapping exists; do not mutate live rows without approved backfill. |
| arrear_b_1      | arrear_tasks | homelink      | 101 | CID-SHARED | company_b         | property_b_1       | MAPPABLE       | COLLISION_RESOLVED_BY_CANONICAL_SCOPE: session_a_1 | PASS   | Canonical company/property mapping exists; do not mutate live rows without approved backfill. |

Summary:

- Rows reconciled: 3.
- Blocked rows: 0.
- Legacy bed/CID collision warnings resolved by canonical scope: 2.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging D1 write: no.
- Staging D1 read: no; static fixture only.
- Dashboard/history live result changed: no.
- Production auth behavior changed: no.
- Legacy CORPID fallback removed: no.
- Secret/password/token/cookie printed: no.

Production meaning:

- P0-006 remains Partial, not Verified.
- This gate proves only local/staging backfill mapping feasibility.
- Production remains blocked until migration SQL, backup, rollback, live query wiring, and human tenancy decisions are approved.

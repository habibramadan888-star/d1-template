# Tenant Scope Local/Staging Rehearsal Result

Generated: 2026-05-25T22:12:55.237Z

Scope: local/staging-only tenant/property scope rehearsal using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard output, or change auth behavior.

Overall: `PASS`

| Scenario                            | Action               | Expected Allowed | Actual Allowed | Visible Rows | Leaked Rows | Result | Notes                          |
| ----------------------------------- | -------------------- | ---------------- | -------------- | ------------ | ----------- | ------ | ------------------------------ |
| owner A dashboard own property      | DASHBOARD_READ       | yes              | yes            | session_a_1  | none        | PASS   | ALLOWED_BY_PROPERTY_MEMBERSHIP |
| owner A denied company B dashboard  | DASHBOARD_READ       | no               | no             | none         | none        | PASS   | NO_PROPERTY_MEMBERSHIP         |
| employee A assigned property entry  | EMPLOYEE_ENTRY_WRITE | yes              | yes            | session_a_1  | none        | PASS   | ALLOWED_BY_PROPERTY_MEMBERSHIP |
| employee A denied property A2 entry | EMPLOYEE_ENTRY_WRITE | no               | no             | none         | none        | PASS   | NO_PROPERTY_MEMBERSHIP         |
| employee A denied owner dashboard   | DASHBOARD_READ       | no               | no             | none         | none        | PASS   | ROLE_NOT_ALLOWED_FOR_ACTION    |
| same bed and CID isolated by tenant | HISTORY_READ         | yes              | yes            | session_a_1  | none        | PASS   | ALLOWED_BY_PROPERTY_MEMBERSHIP |
| orphan session denied               | DASHBOARD_READ       | no               | no             | none         | none        | PASS   | NO_PROPERTY_MEMBERSHIP         |

Summary:

- Scenario count: 7.
- Blocked scenarios: 0.
- Data leak scenarios: 0.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging D1 write: no.
- Production login behavior changed: no.
- Legacy CORPID fallback removed: no.
- Dashboard/history live result changed: no.
- Secret/password/token/cookie printed: no.

Production meaning:

- P0-006 remains Partial, not Verified.
- This rehearsal proves local/staging scope helpers and fixtures only.
- Production remains blocked until migration, backfill, live route enforcement, and human tenancy decisions are approved.

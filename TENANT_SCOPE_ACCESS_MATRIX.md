# Tenant Scope Access Matrix

Date: 2026-05-26, Asia/Dubai

Scope: staging/local access matrix gate only. Production deploy, production migration,
production D1 write, production URL calls, staging D1 write, dashboard mutation, financial formula
change, and secret exposure did not occur.

| Role            | Resource / API               | Own Tenant | Other Tenant | Own Property | Other Property | Expected Result | Current Coverage | Risk                                      |
| --------------- | ---------------------------- | ---------- | ------------ | ------------ | -------------- | --------------- | ---------------- | ----------------------------------------- |
| unauthenticated | employee entry               | n/a        | n/a          | n/a          | n/a            | DENY_401        | TESTED           | unauth request must not create scope      |
| invalid JWT     | dashboard/history            | n/a        | n/a          | n/a          | n/a            | DENY_401        | TESTED           | invalid token must not create scope       |
| employee        | employee entry               | ALLOW      | DENY_403     | ALLOW        | DENY_403       | ALLOW           | TESTED           | employee write must be property scoped    |
| employee        | handover                     | ALLOW      | DENY_403     | ALLOW        | DENY_403       | ALLOW           | TESTED           | handover must not cross tenant/property   |
| employee        | rent_config                  | ALLOW      | DENY_403     | ALLOW        | DENY_403       | ALLOW           | TESTED           | employee config read is property scoped   |
| employee        | dashboard/history            | DENY_403   | DENY_403     | DENY_403     | DENY_403       | DENY_403        | TESTED           | employee cannot use owner dashboard       |
| employee        | delete_session / void        | DENY_403   | DENY_403     | DENY_403     | DENY_403       | DENY_403        | TESTED           | employee must not void owner records      |
| employee        | entry_events                 | n/a        | n/a          | n/a          | n/a            | MANUAL_REQUIRED | DOCUMENTED_ONLY  | live write-path event scope needs review  |
| employee        | legacy CORPID fallback       | n/a        | n/a          | n/a          | n/a            | LEGACY_WARNING  | TESTED           | compatibility only, not SaaS authority    |
| owner           | dashboard/history            | ALLOW      | DENY_403     | ALLOW        | ALLOW          | ALLOW           | TESTED           | tenant-wide property scope must be clear  |
| owner           | sessions                     | ALLOW      | DENY_403     | ALLOW        | ALLOW          | ALLOW           | TESTED           | session rows need tenant filtering        |
| owner           | transactions                 | ALLOW      | DENY_403     | ALLOW        | ALLOW          | ALLOW           | TESTED           | financial rows need tenant filtering      |
| owner           | deposit_ledger               | ALLOW      | DENY_403     | ALLOW        | ALLOW          | ALLOW           | TESTED           | deposit accounting review remains needed  |
| owner           | arrears                      | ALLOW      | DENY_403     | ALLOW        | ALLOW          | ALLOW           | TESTED           | P0-008 remains production blocker         |
| owner           | export/report                | ALLOW      | DENY_403     | ALLOW        | ALLOW          | ALLOW           | TESTED           | export must not leak cross-tenant rows    |
| owner           | delete_session / void        | ALLOW      | DENY_403     | ALLOW        | ALLOW          | ALLOW           | TESTED           | wrong tenant must not void rows           |
| owner           | audit_logs                   | n/a        | n/a          | n/a          | n/a            | MANUAL_REQUIRED | DOCUMENTED_ONLY  | production audit attribution needs review |
| manager         | settings / app_settings      | ALLOW      | DENY_403     | ALLOW        | DENY_403       | ALLOW           | TESTED           | settings are property constrained         |
| manager         | property / room / unit rows  | ALLOW      | DENY_403     | ALLOW        | DENY_403       | DENY_403        | TESTED           | manager cannot cross allowed property     |
| admin           | customer / tenant records    | ALLOW      | DENY_403     | ALLOW        | DENY_403       | ALLOW           | TESTED           | admin scope remains staging/local only    |
| admin           | property / room / unit rows  | ALLOW      | DENY_403     | ALLOW        | ALLOW          | ALLOW           | TESTED           | production admin policy needs approval    |
| all             | frontend tenant_id authority | n/a        | n/a          | n/a          | n/a            | DENY_403        | TESTED           | server-side claim must win                |
| all             | production authority switch  | n/a        | n/a          | n/a          | n/a            | NOT_APPLICABLE  | TESTED           | production remains disabled/no-go         |

## Conclusion

The staging/local access matrix gate is ready. Two documented-only rows remain:

1. `audit_logs` production attribution review.
2. `entry_events` live write-path scope review.

These are not blockers for the next staging/local matrix rehearsal, but they remain production
NO-GO items.

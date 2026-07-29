# Tenant Claim To Route/Query Wiring Matrix

Date: 2026-05-26, Asia/Dubai

Scope: mapping future auth/session tenant claims to route/query wiring gates. No runtime
Worker route was changed in this task.

| Route / Query           | Required Claim                                                   | Current Source                                           | Fallback                | Risk                                            | Status                      |
| ----------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- | ----------------------- | ----------------------------------------------- | --------------------------- |
| employee entry          | `role`, `employee_id`, `tenant_id`, `allowed_property_ids`       | legacy JWT `role/userid/corpid` plus employee table      | legacy `corpid` warning | cross-property employee write without claim     | READY_FOR_STAGING_REHEARSAL |
| handover                | `role`, `employee_id`, `tenant_id`, `allowed_property_ids`       | legacy JWT plus request employee id                      | legacy `corpid` warning | employee/property mismatch                      | READY_FOR_STAGING_REHEARSAL |
| sessions                | `tenant_id`, `allowed_property_ids`, `role`                      | staged compatibility columns plus legacy `corpid`        | legacy `corpid` warning | cross-tenant history leakage                    | READY_FOR_STAGING_REHEARSAL |
| transactions            | `tenant_id`, `allowed_property_ids`, `role`                      | staged compatibility columns plus legacy `corpid`        | legacy `corpid` warning | cross-tenant financial row leakage              | READY_FOR_STAGING_REHEARSAL |
| deposit_ledger          | `tenant_id`, `allowed_property_ids`, `role`                      | staged compatibility columns plus legacy fields          | legacy `corpid` warning | deposit authority needs accounting review       | LEGACY_FALLBACK_WARNING     |
| arrears                 | `tenant_id`, `allowed_property_ids`, `role`                      | staged compatibility columns plus legacy `corpid`        | legacy `corpid` warning | receivables/P0-008 dependency                   | LEGACY_FALLBACK_WARNING     |
| audit_logs              | `tenant_id`, `actor id`, `role`                                  | staged compatibility columns plus legacy `corpid/userid` | legacy `corpid` warning | audit attribution incomplete                    | READY_FOR_STAGING_REHEARSAL |
| entry_events            | `tenant_id`, `employee_id`, `allowed_property_ids`               | staged compatibility columns plus legacy `corpid/userid` | legacy `corpid` warning | employee event scope incomplete                 | READY_FOR_STAGING_REHEARSAL |
| dashboard/history       | `tenant_id`, `allowed_property_ids`, `role`                      | P0-006L fixture-derived scope gate                       | legacy `corpid` warning | live dashboard cannot switch without auth claim | READY_FOR_STAGING_REHEARSAL |
| settings / app_settings | `tenant_id`, owner/manager role, property scope where applicable | legacy tenant-wide settings                              | legacy `corpid` warning | settings model needs tenant split review        | MANUAL_REQUIRED             |

## Conclusion

Claim-to-route/query wiring is ready for a staging/local auth-claim rehearsal. Production remains
`NO-GO` because current live JWT/session claims do not yet carry authoritative tenant/property
membership.

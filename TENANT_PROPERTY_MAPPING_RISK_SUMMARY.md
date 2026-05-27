# Tenant Property Mapping Risk Summary

Date: 2026-05-27, Asia/Dubai

Scope: commercial launch review support only. This summary does not approve
production deploy, migration, production D1 write, staging D1 write,
production-copy D1 write, dashboard change, or financial formula change.

| Category                     | Risk Level | Evidence                                                                       | Remaining Decision                                                               | Production Impact                                                       |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| legacy CORPID fallback       | HIGH       | `TENANCY_SCOPE_AUDIT.md`; `P0_006S_TENANT_SCOPE_PRODUCTION_APPROVAL_PACKET.md` | Ramadan must accept `CORPID` as warning-only fallback, not final SaaS authority. | Production cannot treat deployment `CORPID` as tenant isolation.        |
| missing tenant_id            | BLOCKING   | `TENANT_SCOPE_AUTH_CLAIM_CONTRACT.md`; production approval packet              | Final tenant/company authority must be approved before production switch.        | Missing production tenant claim must deny tenant-scoped access.         |
| missing property_id          | BLOCKING   | compatibility matrix; staging backfill dry-run; production-copy mapping matrix | Property mapping and row counts need data review.                                | Wrong property mapping can leak or hide operational and financial rows. |
| employee/property permission | HIGH       | access matrix rehearsal PASS; auth claim contract                              | Employee allowed-property model needs business approval.                         | Staff must not submit or view rows outside assigned properties.         |
| owner visibility             | HIGH       | access matrix rehearsal PASS; route/query wiring matrix                        | Owner tenant-wide and property-level visibility must be approved.                | Owner dashboard/history must not leak cross-tenant rows.                |
| cross-tenant leakage         | BLOCKING   | access matrix rehearsal PASS; P0-006Q2 audit/event evidence                    | Production route/query switch still needs approval.                              | Any leakage is a production launch blocker.                             |
| audit/event scope            | HIGH       | P0-006Q2 evidence; access matrix coverage gaps now closed for staging evidence | Production audit/event visibility policy must be signed off.                     | Audit/legal evidence must remain visible to the right tenant only.      |
| dashboard/history filtering  | HIGH       | route/query wiring matrix; access matrix rehearsal                             | Dashboard/history live switch must be separately approved.                       | Incorrect filtering changes visible business and financial results.     |
| production backfill risk     | BLOCKING   | production-copy row-level mapping matrix, all relevant rows `MANUAL_REQUIRED`  | Exact production SQL, WHERE clauses, row counts, and backup are still required.  | No production row-level update is authorized.                           |
| rollback risk                | HIGH       | production-copy rollback `PASS_WITH_WARNINGS`; production approval packet      | Production restore/reverse-update plan and owner approval still required.        | Production remains NO-GO until rollback is explicitly approved.         |

## Conclusion

The evidence is sufficient for Ramadan review, not approval. Tenant/property
mapping remains production-blocking until Ramadan records explicit decisions and
production backup, migration, backfill, runtime switch, and rollback approvals
are handled in later tasks.

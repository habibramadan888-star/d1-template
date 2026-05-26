# Tenant Scope Access Matrix Coverage Gaps

Date: 2026-05-26, Asia/Dubai

Source: `TENANT_SCOPE_ACCESS_MATRIX_REHEARSAL_RESULT.md`

Overall result: `PASS`

Missing coverage count: `2`

| Role            | Resource / API              | Coverage        | Gap                                                | Recommendation                               |
| --------------- | --------------------------- | --------------- | -------------------------------------------------- | -------------------------------------------- |
| unauthenticated | employee entry              | TESTED          | none                                               | Keep as regression coverage.                 |
| invalid JWT     | dashboard/history           | TESTED          | none                                               | Keep as regression coverage.                 |
| employee        | employee entry              | TESTED          | none                                               | Use in P0-006P staging/local rehearsal.      |
| employee        | handover                    | TESTED          | none                                               | Use in P0-006P staging/local rehearsal.      |
| employee        | rent_config                 | TESTED          | none                                               | Use in P0-006P staging/local rehearsal.      |
| employee        | dashboard/history           | TESTED          | none                                               | Keep employee owner-route denial.            |
| employee        | delete_session / void       | TESTED          | none                                               | Keep employee void denial.                   |
| employee        | entry_events                | DOCUMENTED_ONLY | live write-path event scope requires review        | Add real staging evidence before production. |
| employee        | legacy CORPID fallback      | TESTED          | production cannot rely on fallback                 | Keep warning-only until fallback retirement. |
| owner           | dashboard/history           | TESTED          | none                                               | Use in P0-006P staging/local rehearsal.      |
| owner           | sessions                    | TESTED          | none                                               | Use in P0-006P staging/local rehearsal.      |
| owner           | transactions                | TESTED          | none                                               | Use in P0-006P staging/local rehearsal.      |
| owner           | deposit_ledger              | TESTED          | accounting review still required                   | Keep production NO-GO until reviewed.        |
| owner           | arrears                     | TESTED          | P0-008 receivables remains production dependency   | Keep production NO-GO.                       |
| owner           | export/report               | TESTED          | export runtime route still needs later staging E2E | Cover in P0-006P or later staging rehearsal. |
| owner           | delete_session / void       | TESTED          | none                                               | Use in P0-006P staging/local rehearsal.      |
| owner           | audit_logs                  | DOCUMENTED_ONLY | production audit attribution requires review       | Add audit-specific staging evidence later.   |
| manager         | settings / app_settings     | TESTED          | production settings tenancy model not approved     | Keep production NO-GO.                       |
| manager         | property / room / unit rows | TESTED          | live property model still needs approval           | Use as staging/local evidence only.          |
| admin           | customer / tenant records   | TESTED          | production admin policy not approved               | Keep production NO-GO.                       |
| admin           | property / room / unit rows | TESTED          | production admin policy not approved               | Keep production NO-GO.                       |
| all             | frontend tenant_id          | TESTED          | none                                               | Keep as critical regression.                 |
| all             | production authority switch | TESTED          | production remains disabled                        | Do not enter production.                     |

## Needs P0-006P

- Broader staging/local rehearsal of the access matrix using route/resource groupings.
- Confirm no role/resource combination regresses from allow/deny expectations.
- Keep feature flags false after rehearsal if any are introduced.

## Needs Production Decision

- Production JWT/session claim issuance.
- Production audit/event attribution.
- Production settings tenancy split.
- Production migration/backfill approval.
- Production cutover approval.

Production remains `NO-GO`.

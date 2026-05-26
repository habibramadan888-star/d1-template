# Tenant Scope Access Matrix Coverage Gaps

Date: 2026-05-26, Asia/Dubai

Source: `TENANT_SCOPE_ACCESS_MATRIX_REHEARSAL_RESULT.md`

Overall result: `PASS`

Missing coverage count: `2`

P0-006P recalculation:

- Total scenarios: 31.
- PASS count: 28.
- MANUAL_REQUIRED count: 2.
- FAIL count: 0.
- NOT_APPLICABLE count: 0.
- LEGACY_WARNING count: 1.

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

## P0-006P Result

- Broader staging/local rehearsal of the access matrix passed.
- `audit_logs` remains `MANUAL_REQUIRED`.
- `entry_events` remains `MANUAL_REQUIRED`.
- No role/resource combination regressed from allow/deny expectations.
- Final feature flag state remains false / legacy in the in-process rehearsal.

## Needs P0-006Q

- Close `audit_logs` manual-required coverage with dedicated staging/local audit evidence.
- Close `entry_events` manual-required coverage with dedicated staging/local entry event evidence.
- Keep production disabled and P0-006 Partial.

## P0-006Q Update

P0-006Q converted the two documented-only/manual-required rows into concrete
staging evidence data gaps.

| Role  | Resource / API | Coverage                    | Gap                                                      | Recommendation                                                                      |
| ----- | -------------- | --------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| owner | `audit_logs`   | NEEDS_STAGING_EVIDENCE_DATA | Owner-created audit evidence with `owner_id` is missing. | Create staging-only QA evidence rows in P0-006Q2 with backup and rollback approval. |
| owner | `audit_logs`   | NEEDS_STAGING_EVIDENCE_DATA | Scoped `session.void` audit evidence is missing.         | Create staging-only QA evidence rows in P0-006Q2 with backup and rollback approval. |
| owner | `entry_events` | NEEDS_STAGING_EVIDENCE_DATA | Scoped `session_void` entry event evidence is missing.   | Create staging-only QA evidence rows in P0-006Q2 with backup and rollback approval. |

P0-006Q summary:

- Total audit/event scenarios: 21.
- PASS count: 17.
- MANUAL_REQUIRED count: 0.
- NEEDS_STAGING_EVIDENCE_DATA count: 3.
- FAIL count: 0.
- Missing coverage count: 2 table-level gaps: `audit_logs`, `entry_events`.

## Needs Production Decision

- Production JWT/session claim issuance.
- Production audit/event attribution.
- Production settings tenancy split.
- Production migration/backfill approval.
- Production cutover approval.

Production remains `NO-GO`.

## P0-006Q2 Update

P0-006Q2 created approved staging-only QA evidence rows in
`homelink-finance-staging` to close the audit/event evidence gaps.

| Role  | Resource / API | Coverage | Gap  | Recommendation                             |
| ----- | -------------- | -------- | ---- | ------------------------------------------ |
| owner | `audit_logs`   | TESTED   | none | Keep as staging QA evidence until signoff. |
| owner | `entry_events` | TESTED   | none | Keep as staging QA evidence until signoff. |

P0-006Q2 summary:

- `audit_logs` QA evidence rows inserted: 5.
- `entry_events` QA evidence rows inserted: 6.
- Tenant audit/event rehearsal result: PASS.
- NEEDS_STAGING_EVIDENCE_DATA count: 0.
- Missing coverage count: 0.
- Staging D1 write: yes, QA evidence rows only.
- Production D1 write: no.

Production remains `NO-GO`; P0-006 remains Partial, not Verified.

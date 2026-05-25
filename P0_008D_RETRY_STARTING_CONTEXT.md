# P0-008D Retry Starting Context

Generated: 2026-05-25, Asia/Dubai

Scope: receivables staging shadow gate after TEST-STABILITY-002. This task is staging/local only and does not approve production deploy, production migration, production cutover, or dashboard live switch.

## What P0-008C Proved

| Area                                  | Result  | Evidence                                                        |
| ------------------------------------- | ------- | --------------------------------------------------------------- |
| Pure receivables model                | PASS    | `modules/finance/receivables.mjs`, `tests/receivables.spec.mjs` |
| Lifecycle fixtures                    | PASS    | 15 fixtures under `tests/fixtures/receivables/`                 |
| Local/staging dry-run rehearsal       | PASS    | `RECEIVABLES_LOCAL_STAGING_REHEARSAL_RESULT.md`                 |
| Legacy arrears comparison             | MATCH   | fixture-based comparison reported 0 delta                       |
| Dashboard future authority definition | CREATED | `RECEIVABLES_DASHBOARD_AUTHORITY_GATE.md`                       |
| Database writes                       | NO      | P0-008C was dry-run/non-invasive                                |

## What P0-008C Did Not Prove

| Gap                          | Status                  | Notes                                                               |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------- |
| Staging D1 shadow comparison | Open before P0-008D     | P0-008C did not read real staging QA data.                          |
| Production migration         | Not approved            | No production schema change.                                        |
| Dashboard live switch        | Not approved            | Live dashboard remains legacy.                                      |
| Tenant/property scope        | Still blocked by P0-006 | Receivables production authority needs scoped customers/properties. |
| Accounting sign-off          | MANUAL_REQUIRED         | Due/overdue/arrears semantics need human review before production.  |

## Dashboard Totals Future Receivables Authority

| Dashboard / KPI         | Future Receivables Role                                    | Current Status                    |
| ----------------------- | ---------------------------------------------------------- | --------------------------------- |
| due today               | receivables `dueTodayFils`                                 | Shadow only                       |
| overdue amount          | receivables `overdueFils`                                  | Shadow only                       |
| arrears total           | receivables active outstanding due on/before business date | Shadow only                       |
| arrears paid            | payment allocations                                        | Needs more staging data           |
| arrears outstanding     | receivables outstanding                                    | Shadow only                       |
| rent due                | receivables amount due                                     | Shadow only                       |
| rent received           | backend totals plus receivable allocations                 | Shadow only                       |
| monthly income relation | backend totals plus receivables policy                     | Needs more data/accounting review |

## Current Staging Data Suitability

| Comparison                 | Can Use Current Staging QA Data | Result                         |
| -------------------------- | ------------------------------- | ------------------------------ |
| rent received              | yes                             | MATCH                          |
| rent due                   | yes                             | MATCH                          |
| deposit separation         | yes                             | MATCH                          |
| void impact                | yes                             | MATCH / no voided rows present |
| due today open receivables | limited                         | NEEDS_MORE_DATA                |
| overdue receivables        | limited                         | NEEDS_MORE_DATA                |
| arrears outstanding        | limited                         | NEEDS_MORE_DATA                |
| repayment / allocation     | limited                         | NEEDS_MORE_DATA                |

## Minimum Safe Scope

- Add read-only staging receivables shadow comparison.
- Add pure tests for shadow feature-flag guard and no-dashboard-mutation guarantees.
- Generate dashboard future authority evidence.
- Keep production disabled and P0-008 Partial.
- Do not write staging D1 rows.
- Do not enable feature flags remotely.

## Rollback Mechanism

No remote flag was enabled in this task. The defined rollback is:

```text
ENABLE_RECEIVABLES_SHADOW_STAGING=false
```

When false, behavior remains legacy/no-shadow and dashboard output remains unchanged.

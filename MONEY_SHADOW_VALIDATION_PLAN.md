# Money Shadow Validation Plan

Generated: 2026-05-24, Asia/Dubai

Scope: P0-001B low-risk shadow validation. This plan does not change dashboard totals, handover submission, live financial writes, database schema, delete-session void behavior, or production configuration.

## Goal

Create a repeatable local-only inspection path that reads legacy money values from the local D1 database, attempts exact AED-to-fils parsing with the money helper, and reports precision risks before any dual-write or production migration work.

## Safe Entry Point

| Candidate Path                           | Risk                                                        | Decision                 |
| ---------------------------------------- | ----------------------------------------------------------- | ------------------------ |
| Live `/api/employee/entry` write path    | High; could reject staff input or change transaction output | Do not touch in P0-001B. |
| Owner dashboard totals                   | High; visible accounting result could change                | Do not touch in P0-001B. |
| Handover summary                         | High; affects cash handover authority                       | Do not touch in P0-001B. |
| Local D1 read-only reconciliation script | Low; no writes and no production access                     | Use now.                 |
| Unit tests around helper behavior        | Low; no runtime business impact                             | Use now.                 |

## Script Design

`scripts/money-shadow-reconcile.mjs` will:

1. Use the existing local-only D1 helper.
2. Refuse remote D1 automatically through the existing bootstrap guard.
3. Discover tables and columns dynamically from local D1 schema.
4. Select likely money columns by name and type.
5. Read non-null values from each candidate column.
6. Parse each value with `parseAedToFils(value, { allowNegative: true })`.
7. Count parse success, empty values, invalid values, values with more than two decimals, negative values, and canonical AED differences.
8. Write `MONEY_SHADOW_RECONCILIATION_RESULT.md`.
9. Never execute `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, remote D1 commands, production migrations, or deploys.

## Validation Commands

| Command                     | Purpose                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `npm run test:money-shadow` | Unit test the shadow analyzer and column detection.                |
| `npm run reconcile:money`   | Run read-only local D1 shadow reconciliation and generate report.  |
| `npm run audit:money`       | Keep static money risk inventory current.                          |
| `npm run verify:clean-d1`   | Confirm clean local D1 remains stable after adding shadow tooling. |

## Status Boundary

P0-001 remains `Partial - P0-001B shadow validation ready`. This stage creates evidence and guardrails only. It does not make integer fils the live accounting authority.

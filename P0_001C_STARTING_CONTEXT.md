# P0-001C Starting Context

Generated: 2026-05-24, Asia/Dubai

Scope: P0-001C minor-unit dual-write preparation. No production migration, remote D1 operation, production deploy, live dashboard switch, live handover switch, or live financial formula change was performed.

## Current Evidence

| Area               | Current State                                                                    | Evidence                                                                      |
| ------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Money policy       | AED authority must be integer fils.                                              | `MONEY_PRECISION_POLICY.md`                                                   |
| Money helper       | `parseAedToFils` and `filsToAedString` exist and reject floating authority.      | `modules/finance/money.mjs`, `npm run test:money`                             |
| Shadow validation  | Legacy values can be parsed and reported without database writes.                | `scripts/money-shadow-reconcile.mjs`, `MONEY_SHADOW_RECONCILIATION_RESULT.md` |
| Backend totals     | Rehearsal can recompute totals from rows in integer fils.                        | `modules/finance/backend-totals.mjs`, `npm run test:backend-totals`           |
| Handover staging   | Staging endpoint writes staging tables only and rejects frontend total mismatch. | `HANDOVER_STAGING_ENDPOINT_IMPLEMENTATION.md`                                 |
| Live legacy schema | Legacy money columns still use `REAL` and JS Number paths.                       | `MONEY_FIELD_INVENTORY.md`, `migrations/local/001_clean_legacy_bootstrap.sql` |

## What P0-001C Can Safely Do Now

| Item                                             | Safe Now? | Reason                                                       |
| ------------------------------------------------ | --------- | ------------------------------------------------------------ |
| Create dual-write draft helper                   | Yes       | It can generate patches without writing database rows.       |
| Create migration draft                           | Yes       | Draft remains outside active local/production migrations.    |
| Create tests for legacy-to-fils patch generation | Yes       | Tests do not change live business behavior.                  |
| Create local rehearsal report                    | Yes       | Read-only schema inspection plus synthetic cases.            |
| Add production migration                         | No        | Requires human approval, staging backup, and reconciliation. |
| Switch live write paths to use `*_fils`          | No        | Would change commercial accounting behavior.                 |
| Switch dashboard to prefer `*_fils`              | No        | Requires P0-003 live authority gate and reconciliation.      |

## Minimum Safe Implementation Boundary

P0-001C in this branch is limited to:

1. A non-invasive dual-write preparation module.
2. A draft-only migration file for nullable `*_fils` fields.
3. Tests proving deterministic patch generation and mismatch reporting.
4. A rehearsal script proving schema gaps and sample conversion outcomes.
5. Status reports keeping P0-001 as Partial.

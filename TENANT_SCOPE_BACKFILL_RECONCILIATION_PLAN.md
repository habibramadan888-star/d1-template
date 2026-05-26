# Tenant Scope Backfill Reconciliation Plan

Date: 2026-05-26, Asia/Dubai

This plan defines how legacy `CORPID` rows should be reconciled before any
future tenant-scope migration. It is a staging/local gate only and does not
execute migration SQL, D1 writes, production commands, or live query changes.

## Mapping Rules

| Legacy Input  | Candidate Target         | Rule                                                      | Blocker                                               |
| ------------- | ------------------------ | --------------------------------------------------------- | ----------------------------------------------------- |
| `corpid`      | compatibility field      | Preserve until all live rows/routes are scoped.           | Removing fallback before backfill is forbidden.       |
| `company_id`  | canonical company scope  | Must exist and map to a known company.                    | Missing or unknown company blocks backfill.           |
| `property_id` | canonical property scope | Must exist and map to a known property under the company. | Missing or unknown property blocks backfill.          |
| `bed`         | collision signal only    | Same bed across companies is not authority.               | Requires human review if company/property is missing. |
| `cid`         | collision signal only    | Same CID across companies is not authority.               | Requires human review if company/property is missing. |
| `table`       | migration target         | Used to group future update statements.                   | Unknown table requires migration review.              |

## Current Fixture Result

| Check               | Result | Notes                                                                          |
| ------------------- | ------ | ------------------------------------------------------------------------------ |
| Rows reconciled     | 3      | Static tenant fixture rows only.                                               |
| Blocked rows        | 0      | All rows have known company/property candidates.                               |
| Collision warnings  | 2      | Same bed/CID appears across companies and is resolved only by canonical scope. |
| Staging D1 write    | no     | No D1 write command was executed.                                              |
| Production D1 write | no     | No production database command was executed.                                   |

## Future Backfill Command Draft

SAFE_TO_RUN_NOW: no

NEEDS_HUMAN_APPROVAL: yes

WRITES_SCHEMA: no

WRITES_DATA: yes

PRODUCTION_FORBIDDEN: yes

```powershell
# Draft only. Do not run in this task.
npm run gate:tenant-scope-backfill-reconciliation
```

Any future data-writing backfill must be a separate staging-only task with:

- confirmed target D1 name/id,
- backup completed,
- rollback plan accepted,
- row-count reconciliation before/after,
- dashboard/history diff evidence,
- production explicitly excluded.

## NO-GO Conditions

- Any row lacks `company_id` or `property_id`.
- Any `company_id` or `property_id` cannot be mapped to a known target.
- Any migration infers property from free text without a reconciliation report.
- Any production command is proposed before human approval.
- Any live query is switched before dashboard/history evidence passes.

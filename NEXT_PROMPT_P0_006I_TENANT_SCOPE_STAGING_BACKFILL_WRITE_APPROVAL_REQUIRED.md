# NEXT PROMPT: P0-006I Tenant Scope Staging Backfill Write Approval Required

Enter TASK P0-006I: Tenant scope staging backfill write approval gate.

Current state:

- P0-006H dry-run passed.
- P0-006H-REVIEW legacy `CORPID` warning review completed.
- Legacy `CORPID` warning tables: 9.
- Current warning tables do not have direct `tenant_id`, `property_id`,
  `corp_id`, `owner_id`, or `employee_id` columns.
- Staging D1 write has not occurred.
- Production cutover remains `NO-GO`.

Task goal:

Prepare or execute staging tenant-scope backfill only if all human approval
flags and prerequisite evidence are present. If any prerequisite is missing,
stop before write and update the approval packet.

Required human confirmation flags before any staging write:

- `--confirm-staging-backfill-write`
- `--confirm-backup`
- `--confirm-rollback`
- `--confirm-legacy-corpid-warnings-reviewed`

Strictly forbidden:

1. Do not execute production deploy.
2. Do not execute production migration.
3. Do not execute remote production D1 migration.
4. Do not write production D1.
5. Do not call production URL.
6. Do not modify production wrangler config.
7. Do not commit secrets.
8. Do not print password/token/cookie values.
9. Do not mark P0-006 Verified.
10. Do not mark production cutover GO.
11. Do not remove legacy `CORPID` fallback.
12. Do not run any full-table unguarded update.
13. Do not delete data.

Required prerequisites:

1. Confirm target D1 name is `homelink-finance-staging`.
2. Confirm target D1 id is `4ff78bfc-3855-436b-aefb-6b492145d79c`.
3. Confirm production D1 is excluded.
4. Complete staging D1 backup.
5. Confirm rollback method.
6. Review the exact update plan.
7. Confirm target schema columns exist before any update.
8. Confirm all 9 legacy `CORPID` warnings are accepted by a human reviewer.
9. Confirm every update has a primary-key WHERE clause and a legacy `corpid`
   guard.
10. Confirm dashboard/history diff evidence plan.

If target schema columns are still missing:

- Do not write.
- Output `MANUAL_REQUIRED`.
- Generate a staging-only schema/compatibility-column approval prompt.

Required validation:

- `npm run check`
- `npm run security:secrets`
- `npm run gate:commercial-launch`
- `npm run qa:employee-entry-staging`

Completion rule:

- P0-006 must remain Partial.
- Production must remain `NO-GO`.

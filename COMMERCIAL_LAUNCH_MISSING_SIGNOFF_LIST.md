# Commercial Launch Missing Signoff List

Date: 2026-05-27, Asia/Dubai

Result: `PRODUCTION_NO_GO`

## Must-have before production copy final dry-run

| Priority | Missing Signoff                           | Why Required                                                                          | Blocks Which Step             | Evidence Needed                                                      |
| -------: | ----------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------- |
|        1 | Accounting review of money conversion     | Final copy dry-run should use approved reconciliation expectations.                   | Production-copy final dry-run | Accounting signoff against `FINAL_PRODUCTION_APPROVAL_CHECKLIST.md`. |
|        2 | Tenant/property mapping review            | Copy final dry-run must reflect approved mapping, not compatibility-only assumptions. | Production-copy final dry-run | Business and engineering mapping signoff.                            |
|        3 | Receivables lifecycle/allocation decision | Copy final dry-run must know whether receivables are deferred or backfilled.          | Production-copy final dry-run | Receivables owner decision.                                          |
|        4 | Rollback owner assignment                 | Final dry-run should validate rollback criteria and ownership.                        | Production-copy final dry-run | Rollback owner signoff.                                              |

## Must-have before production migration

| Priority | Missing Signoff                     | Why Required                                                 | Blocks Which Step    | Evidence Needed                                        |
| -------: | ----------------------------------- | ------------------------------------------------------------ | -------------------- | ------------------------------------------------------ |
|        1 | Fresh production D1 backup approval | Production write cannot proceed without a restorable backup. | Production migration | Backup command approval and integrity record.          |
|        2 | Final production SQL approval       | Copy SQL is not production authorization.                    | Production migration | Exact SQL, WHERE clauses, row counts, rollback method. |
|        3 | TOP_25 money risks approval         | Money risks affect financial correctness.                    | Production migration | Closed or explicitly accepted risk list.               |
|        4 | Data migration owner signoff        | Row-level updates need accountable approval.                 | Production migration | Migration/backfill owner signoff.                      |

## Must-have before production deploy

| Priority | Missing Signoff                   | Why Required                                              | Blocks Which Step | Evidence Needed                                                |
| -------: | --------------------------------- | --------------------------------------------------------- | ----------------- | -------------------------------------------------------------- |
|        1 | Production feature flags approval | Flags control live authority switches and rollback.       | Production deploy | Exact flag names, values, rollback states.                     |
|        2 | Deployment owner approval         | Prevents wrong target or accidental production mutation.  | Production deploy | Deploy target, command, freeze window, verification checklist. |
|        3 | Security / secrets approval       | Production deploy must not expose secrets or unsafe logs. | Production deploy | Secret scan, redaction, observability review.                  |

## Must-have before business cutover

| Priority | Missing Signoff                    | Why Required                                                | Blocks Which Step | Evidence Needed                           |
| -------: | ---------------------------------- | ----------------------------------------------------------- | ----------------- | ----------------------------------------- |
|        1 | Business owner launch acceptance   | Cutover is a business decision, not just engineering proof. | Business cutover  | Signed launch acceptance.                 |
|        2 | Production cutover window approval | Cutover needs staffing, freeze, rollback window.            | Business cutover  | Approved window and owner roster.         |
|        3 | Post-cutover monitoring approval   | Launch requires alerting and verification plan.             | Business cutover  | Monitoring checklist and escalation path. |

## Must-have after cutover monitoring

| Priority | Missing Signoff                                 | Why Required                                          | Blocks Which Step              | Evidence Needed                         |
| -------: | ----------------------------------------------- | ----------------------------------------------------- | ------------------------------ | --------------------------------------- |
|        1 | Post-cutover reconciliation signoff             | Confirms financial data stayed correct after cutover. | Sustained production operation | Production reconciliation report.       |
|        2 | Rollback closure or rollback execution decision | Confirms whether to keep or end rollback window.      | Launch closure                 | Operations and business owner decision. |
|        3 | Incident / audit review                         | Confirms no security, audit, or access regressions.   | Launch closure                 | Audit/event/access review.              |

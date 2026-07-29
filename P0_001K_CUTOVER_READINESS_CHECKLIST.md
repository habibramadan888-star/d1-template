# P0-001K Cutover Readiness Checklist

Generated: 2026-05-25, Asia/Dubai

Scope: staging QA and production cutover readiness gate for the employee entry adapter route switch. This checklist does not approve production cutover.

## GO for Real Staging QA

| Condition                                      | Status                | Evidence                                                                                        |
| ---------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| P0-001J tests pass                             | GO                    | `npm run test:employee-entry-route-switch`                                                      |
| Production behavior remains legacy             | GO                    | `npm run test:employee-entry-production-lock`                                                   |
| Feature flag off remains legacy                | GO                    | `npm run rehearse:employee-entry-rollback`                                                      |
| Local/staging flag on adapter works            | GO                    | `npm run test:employee-entry-route-switch`                                                      |
| Rollback by flag off works                     | GO                    | `EMPLOYEE_ENTRY_ROLLBACK_DRILL_RESULT.md`                                                       |
| Dashboard/history behavior is understood       | GO                    | `EMPLOYEE_ENTRY_LEGACY_VS_ADAPTER_COMPARISON.md`                                                |
| Invalid money is rejected                      | GO                    | Route-switch and comparison tests                                                               |
| Three decimals are rejected                    | GO                    | `npm run compare:employee-entry-routes`                                                         |
| Owner/admin denied in adapter mode             | GO                    | `npm run test:employee-entry-route-switch`                                                      |
| Reconciliation gate has no FAIL/BLOCKED        | GO with manual review | `MONEY_RECONCILIATION_GATE_RESULT.md` shows `MANUAL_REQUIRED`, `FAIL=0`, `BLOCKED=0`            |
| Secret scan passes                             | GO                    | `npm run security:secrets`                                                                      |
| Embedded Worker dry-run has 0 critical missing | GO with warning       | `npm run build:embedded:dry-run` reports WARNING but 0 current/generated missing critical items |
| Staging environment owner confirmed            | MANUAL_REQUIRED       | Human must confirm actual staging owner/account/environment                                     |
| Staging D1 backup/rollback plan exists         | MANUAL_REQUIRED       | Must be confirmed before real staging deployment or migration                                   |

## NO-GO for Production Cutover

| Condition                                    | Status               | Reason                                                                               |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| P0-001 still Partial                         | NO-GO                | Production cutover has not occurred and must not be marked Verified.                 |
| Reconciliation gate is MANUAL_REQUIRED       | NO-GO                | Future fils fields and dashboard authority still require human approval.             |
| Production migration not approved            | NO-GO                | No production or remote D1 migration has been executed or approved.                  |
| Remote D1 migration not approved             | NO-GO                | Remote mutation remains prohibited.                                                  |
| P0-008 receivables not implemented           | NO-GO                | Receivables model remains a production-cutover dependency.                           |
| P0-006 tenant/property scope not implemented | NO-GO                | SaaS-grade tenant isolation remains a production-cutover dependency.                 |
| P0-003 dashboard authority not live switched | NO-GO                | Backend totals authority remains rehearsal/gate level.                               |
| True staging QA not completed                | NO-GO                | Current evidence is local automated QA plus manual guide.                            |
| Production rollback not exercised            | NO-GO                | Only local feature-flag rollback has been rehearsed.                                 |
| TOP_25_MONEY_RISKS not manually reviewed     | NO-GO                | Human accounting/engineering review is still required.                               |
| Embedded dry-run still WARNING               | NO-GO for production | 0 critical missing items, but warning still requires deploy-prep review.             |
| No production-copy backfill rehearsal        | NO-GO                | Production data backfill/reconciliation has not been rehearsed on a production copy. |

## Human Approval Required

| Decision                                                            | Required Before    |
| ------------------------------------------------------------------- | ------------------ |
| Confirm exact real staging environment and D1 target                | Real staging QA    |
| Confirm no production deploy or migration in staging QA command set | Real staging QA    |
| Confirm staging D1 backup and rollback method                       | Real staging QA    |
| Review `deploy-worker/src/index.js` route switch block              | Real staging QA    |
| Review owner/admin behavior difference between legacy and adapter   | Production cutover |
| Review voided-row behavior difference between legacy and adapter    | Production cutover |
| Review TOP_25 money risks and legacy REAL fields                    | Production cutover |
| Approve P0-001E/P0-003/P0-006/P0-008 dependency sequencing          | Production cutover |

## Gate Conclusion

GO for real staging QA: YES, with manual environment and backup confirmation.

NO-GO for production cutover: YES. Production remains blocked.

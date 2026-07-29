# Final Production Approval Checklist

Date: 2026-05-27, Asia/Dubai

Status: `PRODUCTION_NO_GO`

This checklist is documentation only. It does not approve production deploy,
production migration, production D1 write, feature flag enablement, or cutover.

| Approval Item            | Required Evidence                                                 | Current Evidence                                       | Current Status              | Required Before GO                                            |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------ | --------------------------- | ------------------------------------------------------------- |
| Production D1 target     | Confirmed production D1 name and id                               | `homelink` was identified in prior copy setup          | REVIEWED_FOR_COPY_ONLY      | Reconfirm immediately before any production command.          |
| Production backup        | Fresh production export, backup path outside git, integrity check | Prior copy backup existed for production-copy creation | REQUIRED_FRESH_BACKUP       | Export and verify a fresh backup in a separate approved task. |
| Restore / rollback proof | Restore or reverse-update rehearsal with row counts               | Copy rollback `PASS_WITH_WARNINGS`                     | APPROVAL_REQUIRED           | Production-specific rollback approval and execution plan.     |
| Migration SQL            | Exact reviewed SQL, no unsafe operations, production target guard | Copy schema and row-level dry-runs exist               | MANUAL_REQUIRED             | Final SQL review and human approval.                          |
| Row-level backfill       | Exact rows, WHERE clauses, rollback method                        | Copy-only row backfill evidence exists                 | MANUAL_REQUIRED             | Owner-approved row lists and expected counts.                 |
| Money reconciliation     | AED-to-fils conversion evidence and TOP_25 closure                | Copy evidence ready, TOP_25 still open                 | ACCOUNTING_SIGNOFF_REQUIRED | Accounting signoff and accepted residual risks.               |
| Tenant/property scope    | Final tenant/property mapping, not legacy `CORPID` authority      | Compatibility-only mapping on copy                     | MANUAL_REQUIRED             | Business and engineering signoff.                             |
| Receivables              | Lifecycle/allocation/backfill decision                            | Receivables backfill not executed                      | MANUAL_REQUIRED             | Accounting and engineering decision.                          |
| Audit/event visibility   | Tenant/property visibility policy                                 | Compatibility scope rehearsal evidence exists          | MANUAL_REQUIRED             | Policy and query enforcement approval.                        |
| Production deploy        | Deploy plan, flags, freeze window, monitoring                     | Not approved                                           | NO_GO                       | Explicit deploy approval.                                     |
| Production cutover       | Business owner launch acceptance                                  | Not approved                                           | NO_GO                       | Explicit cutover approval.                                    |

Conclusion: final production approval is not granted. Commercial launch remains
`PRODUCTION_NO_GO`.

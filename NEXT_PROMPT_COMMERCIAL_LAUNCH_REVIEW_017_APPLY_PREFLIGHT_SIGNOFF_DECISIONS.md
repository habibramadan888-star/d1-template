# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-017 Apply Preflight Signoff Decisions

Use this prompt only after Ramadan Habib has explicitly filled production
preflight decisions.

## Strict Scope

Only update documentation and signoff trackers.

Do not execute:

1. Production deploy.
2. Staging deploy.
3. Production migration.
4. Remote production D1 migration.
5. Production D1 write.
6. Staging D1 write.
7. Production-copy D1 write.
8. D1 export/import/execute.
9. Production URL call.
10. Production config change.
11. Feature flag enablement.
12. Business code change.
13. Dashboard change.
14. Financial formula change.

## Required Inputs

Ramadan must provide explicit item-by-item decisions for:

1. Money reconciliation and TOP_25 residual risks.
2. Tenant/property final SaaS mapping and legacy `CORPID` fallback policy.
3. Receivables lifecycle/allocation preflight acceptance.
4. Audit/event visibility.
5. Backend totals authority preflight criteria.
6. Employee entry and handover preflight criteria.
7. Production D1 target/backup/rollback/manual-required items, if any.

## Required Behavior

- Do not auto-approve any decision that Ramadan did not explicitly fill.
- `APPROVED_FOR_PREFLIGHT` may be recorded only as documentation wording if
  tracker status values do not support it.
- Do not mark production write, deploy, or cutover as approved.
- Production status must remain `PRODUCTION_NO_GO` unless a later task
  explicitly changes the launch gate after all required production approvals.

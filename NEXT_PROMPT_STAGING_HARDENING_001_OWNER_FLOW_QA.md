# NEXT PROMPT: STAGING-HARDENING-001 Owner Flow QA

Enter TASK STAGING-HARDENING-001: Owner/employee staging manual QA hardening.

Scope:

- Staging/local only.
- No production deploy.
- No staging deploy unless separately approved.
- No production migration.
- No production D1 write.
- No production cutover.

Goals:

1. Verify owner dashboard/history behavior against staging evidence.
2. Verify employee entry and handover owner-visible history.
3. Verify audit logs and entry events for owner/employee flows.
4. Verify void/delete session visibility and rollback evidence.
5. Verify export/report behavior if available.
6. Confirm no frontend totals are accounting authority.
7. Keep commercial launch gate `PRODUCTION_NO_GO`.

Required outputs:

- `STAGING_HARDENING_OWNER_FLOW_QA_PLAN.md`
- `STAGING_HARDENING_OWNER_FLOW_QA_RESULT.md`
- `STAGING_HARDENING_AUDIT_HISTORY_EVIDENCE.md`
- `STAGING_HARDENING_REMAINING_GAPS.md`

Completion rule:

- Stop after staging evidence.
- Do not enter production.

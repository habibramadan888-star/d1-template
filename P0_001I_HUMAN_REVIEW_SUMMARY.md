# P0-001I Human Review Summary

Date: 2026-05-24, Asia/Dubai

Scope: review only. This file summarizes what the next P0-001J prompt would do
and what it must not do.

## Answers Required By Review

| Question                                                    | Answer                                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. P0-001J 到底会修改什么？                                 | P0-001J would implement a local/staging-only rehearsal around the existing `POST /api/employee/entry` route behind a feature flag. It would add tests, rehearsal scripts, and reports. It must not change production behavior.                     |
| 2. 是否会修改 live `/api/employee/entry`？                  | In local/staging rehearsal, yes, the route code would be touched behind a non-production feature flag. In production, behavior must remain legacy and unchanged.                                                                                   |
| 3. 是否有 feature flag？                                    | Yes. Proposed flag: `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true`.                                                                                                                                                                               |
| 4. 是否 local/staging only？                                | Yes. The flag is only valid when `APP_ENV` is `development`, `dev`, `local`, `test`, or `staging`.                                                                                                                                                 |
| 5. 是否 production disabled？                               | Production must remain on current legacy behavior. P0-001J must not enable adapter live-route behavior in production.                                                                                                                              |
| 6. 是否有 rollback？                                        | Yes. Rollback is by disabling `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE`, restoring legacy route behavior in local/staging rehearsal.                                                                                                              |
| 7. 是否会影响 dashboard？                                   | It must not affect dashboard/history output. Future tests must include before/after dashboard unchanged validation.                                                                                                                                |
| 8. 是否会影响 live financial formula？                      | It must not modify live financial formulas. Adapter pre-validation can run, but accounting authority cannot be switched without later approval.                                                                                                    |
| 9. 是否会写 `transactions` / `deposit_ledger` / `arrears`？ | The future P0-001J prompt says valid adapter drafts may continue into current legacy write path for local/staging rehearsal only. Production writes must remain unchanged. Any write behavior must be verified with local/staging table snapshots. |
| 10. 是否会使用 `*_fils`？                                   | Adapter output uses integer-fils plans. Live authority is not switched to `*_fils` in production.                                                                                                                                                  |
| 11. 是否保留 legacy 字段？                                  | Yes. Legacy decimal/REAL fields must remain for rollback and current dashboard/history compatibility.                                                                                                                                              |
| 12. 是否仍然禁止 production migration？                     | Yes. Production and remote D1 migration remain forbidden.                                                                                                                                                                                          |
| 13. 是否需要 embedded Worker controlled write？             | P1-006B already refreshed embedded artifact and drift checks. P0-001J still must run embedded/dry-run checks if its Worker route changes affect embedded deployment artifacts.                                                                     |
| 14. 是否需要人工确认财务公式？                              | Yes before any production cutover or dashboard/read authority switch. Local/staging adapter validation can proceed only if it does not redefine financial formulas.                                                                                |
| 15. 是否需要人工确认 tenant/property scope？                | Yes before SaaS production rollout. P0-006 remains Partial and static CORPID/tenant limitation is still a production blocker.                                                                                                                      |

## What P0-001J Can Safely Do After Approval

- Add local/staging-only route switch rehearsal around `/api/employee/entry`.
- Require `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true`.
- Keep production behavior unchanged.
- Run adapter pre-validation before local/staging legacy write.
- Reject invalid adapter drafts before write.
- Add audit evidence that adapter pre-validation ran.
- Add tests and rehearsal scripts.
- Verify dashboard unchanged and rollback by feature flag.

## What P0-001J Must Not Do

- No production deploy.
- No staging deploy unless a separate deploy task approves it.
- No production D1 migration.
- No remote D1 migration.
- No production behavior switch.
- No dashboard/history authority switch.
- No handover live flow switch.
- No deletion of legacy fields.
- No hard-coded secrets.
- No auth bypass.
- No frontend totals as accounting authority.

## Review Conclusion

P0-001J is technically prepared as a local/staging-only rehearsal task. It still
requires explicit human approval because it touches the live route code path,
even though the intended behavior is feature-flagged and non-production only.

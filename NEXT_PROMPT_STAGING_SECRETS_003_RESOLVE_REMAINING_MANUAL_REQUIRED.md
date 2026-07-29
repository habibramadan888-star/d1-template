# NEXT PROMPT: STAGING-SECRETS-003 Resolve Remaining Manual Required Items

Use this prompt only after reviewing `STAGING_QA_WRITE_READINESS_DECISION.md`.

```text
进入 TASK STAGING-SECRETS-003：Resolve remaining staging manual requirements before write QA.

当前状态：
1. Staging D1 schema bootstrap completed.
2. Staging schema backup exists and is ignored.
3. Staging secrets are set in Cloudflare staging.
4. Employee test account `employee_stg_qa_001` exists in staging `employee_users`.
5. Owner/manager test identities are configured through staging `USER_ACCOUNTS` secret.
6. No secrets/passwords are committed.
7. Real staging write QA has not executed.
8. Production cutover remains NO-GO.

目标：
只解决剩余人工项，不执行真实 staging write QA，除非另有明确批准。

剩余必须处理：
1. Cloudflare Dashboard 确认 production URL/custom route 已排除。
2. Runtime rollback rehearsal plan acceptance：确认未来若开启 staging flags，如何恢复 false 并验证 legacy/dry-run behavior。
3. 人工接受 staging schema backup evidence。
4. 重新运行 dry-run QA。

严格禁止：
1. 不执行 production deploy。
2. 不执行 production migration。
3. 不执行 remote production D1 migration。
4. 不调用 employee entry write endpoint。
5. 不调用 handover staging write endpoint。
6. 不写 sessions / transactions / deposit_ledger / arrears。
7. 不提交 secret/password/token/cookie。
8. 不把 READY_FOR_STAGING_WRITE_QA 标记为 yes，除非 production URL 排除和 rollback acceptance 都完成。

验证：
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run qa:employee-entry-staging
npm run audit:worker-drift
npm run verify:embedded-worker
npm run build:embedded:dry-run

输出：
1. PRODUCTION_URL_EXCLUSION_FINAL_REVIEW.md
2. STAGING_ROLLBACK_RUNTIME_REHEARSAL_RESULT.md
3. STAGING_QA_WRITE_READINESS_DECISION.md
4. STAGING_QA_EVIDENCE_TEMPLATE.md

如果全部满足，生成 NEXT_PROMPT_STAGING_QA_005_REAL_WRITE_QA_APPROVAL_REQUIRED.md。
完成后停止，不要进入真实 staging write QA。
```

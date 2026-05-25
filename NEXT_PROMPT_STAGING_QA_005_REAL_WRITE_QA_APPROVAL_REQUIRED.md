# NEXT PROMPT: STAGING-QA-005 Real Staging Write QA Approval Required

Use this prompt only after a human explicitly approves real staging write QA.

```text
进入 TASK STAGING-QA-005：Real staging write QA with explicit confirmation.

当前状态：
1. Staging Worker URL confirmed non-production:
   https://homelink-finance-staging.habibramadan888.workers.dev
2. Staging D1 schema bootstrap completed.
3. Staging backup exists and is ignored.
4. Staging secrets are set.
5. Employee test account exists.
6. Owner/manager identities are configured through staging USER_ACCOUNTS secret.
7. Production URL/custom route exclusion confirmed.
8. Rollback preflight is ready.
9. gate:commercial-launch remains PRODUCTION_NO_GO.

本任务允许真实 staging write QA only if all explicit flags are supplied:

--confirm-staging-write
--confirm-backup
--confirm-rollback

严格禁止：
1. 不执行 production deploy。
2. 不执行 production migration。
3. 不执行 remote production D1 migration。
4. 不开启 production feature flags。
5. 不执行 production cutover。
6. 不提交 secret/password/token/cookie。
7. 不修改 production config。
8. 不把 staging QA success 标记为 production ready。

允许：
1. 只对 staging Worker URL 执行 approved write QA。
2. 只对 homelink-finance-staging 执行 staging test writes。
3. 使用已确认 staging test accounts。
4. 验证 employee entry write path。
5. 验证 handover staging endpoint。
6. 验证 invalid money / 3dp / empty amount rejection。
7. 验证 owner/manager denied where expected。
8. 验证 rollback by setting feature flags false。
9. 验证 dashboard/history expected behavior。
10. 生成 evidence packet。

必须运行：
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run qa:employee-entry-staging -- --confirm-staging-write --confirm-backup --confirm-rollback
npm run audit:worker-drift
npm run verify:embedded-worker
npm run build:embedded:dry-run

完成后输出：
1. 是否执行 production deploy: no
2. 是否执行 production migration: no
3. 是否写 staging business data: yes/no
4. 写入了哪些 staging test rows
5. rollback 是否验证
6. production cutover 是否仍 NO-GO

完成后停止，不要进入 production cutover。
```

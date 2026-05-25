# NEXT PROMPT: STAGING-SECRETS-002 Resolve Manual Required Items

Use after reviewing STAGING-SECRETS-001 outputs.

```text
进入 TASK STAGING-SECRETS-002：Resolve staging secrets, test accounts, rollback, and production URL manual requirements.

当前状态：
STAGING-SECRETS-001 已完成。密码材料已生成到 ignored local file，但 staging secrets 未设置，test accounts 未创建，rollback 未实际演练，production URL/custom route 排除仍为 MANUAL_REQUIRED。

目标：
1. 人工确认是否允许设置 staging secrets。
2. 设置 staging-only secrets，不提交 secret。
3. 人工确认是否允许只对 homelink-finance-staging 创建 test account rows。
4. 创建/确认 employee、owner、manager/admin staging test accounts。
5. 演练 feature flag rollback。
6. 确认 production URL/custom route 排除。
7. 不执行真实 staging write QA。

严格禁止：
1. 不执行 production deploy。
2. 不执行 staging deploy。
3. 不执行 production migration。
4. 不执行新的 staging schema migration。
5. 不调用 employee entry write endpoint。
6. 不调用 handover staging write endpoint。
7. 不写 sessions / transactions / deposit_ledger / arrears 业务数据。
8. 不提交 password / token / cookie / secret。

允许：
1. 只设置 --env staging secrets。
2. 只写 homelink-finance-staging 的 test account/auth rows，前提是人工明确批准。
3. 只运行 qa:employee-entry-staging dry-run。

完成后输出：
1. secrets 是否已设置。
2. test accounts 是否已确认。
3. rollback 是否已演练。
4. production URL 是否已排除。
5. 是否 READY_FOR_STAGING_WRITE_QA。
```

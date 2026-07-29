# NEXT PROMPT: STAGING-SECRETS-001 Test Accounts And Rollback

Use only after STAGING-DB-002 is committed.

```text
进入 TASK STAGING-SECRETS-001：Staging secrets, test accounts, and rollback rehearsal.

当前状态：
STAGING-DB-002 已完成。staging D1 schema bootstrap 已应用到 homelink-finance-staging。

目标：
1. 设置或确认 staging secrets。
2. 创建或确认 staging employee / owner / manager test accounts。
3. 演练 rollback by feature flag off。
4. 不执行真实 staging write QA。
5. 不提交 secret。

严格禁止：
1. 不执行 production deploy。
2. 不执行 staging deploy。
3. 不执行 production migration。
4. 不执行 remote production D1 migration。
5. 不写 production D1。
6. 不提交 password / token / cookie / secret。
7. 不把密码写入 Markdown。
8. 不开启 production feature flags。
9. 不执行真实 staging write QA。

允许：
1. 只对 staging 环境设置 Cloudflare secrets。
2. 如人工明确批准，可只对 homelink-finance-staging 创建测试账号。
3. 演练 feature flag off rollback。
4. 运行 qa:employee-entry-staging dry-run。

必须确认：
1. Target Worker is homelink-finance-staging.
2. Target D1 is homelink-finance-staging / 4ff78bfc-3855-436b-aefb-6b492145d79c.
3. Backup from STAGING-DB-002 exists outside git.
4. Production URL is excluded or remains MANUAL_REQUIRED.

完成后输出：
1. secrets 是否设置。
2. test accounts 是否创建/确认。
3. rollback by feature flag off 是否演练。
4. 是否提交 secret：必须 no。
5. 是否可以进入 STAGING-QA-005 real write QA。
```

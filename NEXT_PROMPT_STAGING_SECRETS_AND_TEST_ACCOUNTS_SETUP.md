# NEXT PROMPT: STAGING Secrets And Test Accounts Setup

Use this prompt only after human approval. Do not run it as part of STAGING-QA-004.

```text
进入 TASK STAGING-SECRETS-AND-ACCOUNTS-001：Set staging secrets and prepare staging test accounts.

目标：
设置或确认 staging-only secrets，并准备 employee/owner/manager 测试账号。

严格禁止：
1. 不提交 secret。
2. 不把 password/token/cookie 写入 Markdown。
3. 不读取、打印、提交 `.env` / `.dev.vars` 真实内容。
4. 不执行 production deploy。
5. 不执行 production migration。
6. 不写 production D1。
7. 不使用弱密码。
8. 默认不写 staging D1，除非人工确认 backup、rollback、目标 D1、schema 状态。

允许：
1. 生成人工可执行的 secret setup 命令。
2. 使用 24+ 字符强随机密码，但只写入 Cloudflare staging secret 或 approved ignored secret file。
3. 验证 secret 名称存在性，不打印值。
4. 如果人工明确确认 `--confirm-staging-write`、`--confirm-backup`、`--confirm-rollback`，可在 staging-only D1 中创建测试账号。

目标资源：
Worker: `homelink-finance-staging`
D1: `homelink-finance-staging`
KV: `RATE_LIMIT_STAGING`
APP_ENV: `staging`

输出：
1. STAGING_SECRET_SETUP_RESULT.md
2. STAGING_TEST_ACCOUNTS_SETUP_RESULT.md
3. STAGING_ACCOUNT_CREATION_SAFETY_REVIEW.md

完成后停止，不要执行真实 staging QA。
```

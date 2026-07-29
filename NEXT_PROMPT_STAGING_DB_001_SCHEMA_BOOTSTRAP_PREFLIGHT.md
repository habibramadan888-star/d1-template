# NEXT PROMPT: STAGING-DB-001 Schema Bootstrap Preflight

Use this prompt only after human approval. Do not run it as part of STAGING-QA-004.

```text
进入 TASK STAGING-DB-001：Staging D1 schema/bootstrap preflight.

目标：
只处理 staging D1 schema 状态确认和 staging-only bootstrap 计划。

严格禁止：
1. 不执行 production deploy。
2. 不执行 production D1 migration。
3. 不执行 remote production D1 execute。
4. 不写 production 数据。
5. 不提交 secret。
6. 不提交 password/token/cookie。
7. 不把 staging migration 误认为 production ready。

允许：
1. 读取本地 migration / bootstrap 文档。
2. 只读确认 staging D1 metadata。
3. 生成 staging schema checklist。
4. 如果且仅如果人工确认 backup 已完成、rollback 已记录、目标 D1 是 `homelink-finance-staging`，才允许执行 staging-only schema bootstrap。

必须先验证：
1. staging D1 name = `homelink-finance-staging`
2. staging D1 id = `4ff78bfc-3855-436b-aefb-6b492145d79c`
3. backup evidence exists
4. rollback procedure exists
5. command includes staging target only

输出：
1. STAGING_D1_SCHEMA_PREFLIGHT_RESULT.md
2. STAGING_D1_BOOTSTRAP_PLAN.md
3. STAGING_D1_PRODUCTION_SAFETY_REVIEW.md

完成后停止，不要执行真实 staging QA。
```

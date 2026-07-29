# NEXT PROMPT: P0-006C Tenant Scope Local/Staging Rehearsal

Use only after P0-006B readiness gate review.

```text
进入 TASK P0-006C：Tenant/property scope local/staging rehearsal.

目标：
在 local/staging 范围内建立 company/property/user membership fixtures、cross-tenant denial tests、dry-run scope checks。不执行 production/remote migration，不重写所有查询，不改变 production auth 行为。

严格限制：
1. 不执行 production deploy。
2. 不执行 production D1 migration。
3. 不执行 remote D1 migration。
4. 不提交 secret。
5. 不做全局 tenant rewrite。
6. 不改 production login behavior。
7. 不删除 legacy CORPID fallback。
8. 不把 P0-006 标记 Verified。

必须先读取：
- P0_006B_TENANT_PROPERTY_SCOPE_READINESS_GATE.md
- TENANT_SCOPE_READINESS_GATE_RESULT.md
- TENANCY_SCOPE_AUDIT.md
- TENANCY_MIGRATION_PLAN.md
- TENANCY_TEST_PLAN.md
- API_INVENTORY.md
- DATABASE_AUDIT.md

必须新增：
- local/staging tenant scope fixtures
- cross-tenant denial tests
- scope dry-run report
- no production mutation

必须验证：
npm run check
npm run gate:tenant-scope
npm run smoke:with-worker
npm run security:secrets
```

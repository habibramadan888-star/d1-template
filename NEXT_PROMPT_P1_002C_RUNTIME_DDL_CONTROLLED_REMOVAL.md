# NEXT PROMPT: P1-002C Runtime DDL Controlled Removal

Use only after P1-002B readiness gate review.

```text
进入 TASK P1-002C：Runtime DDL controlled disable/removal rehearsal.

目标：
在 local/staging 范围内验证 Worker 能在 migration-owned schema 上运行，并通过 feature flag 或 explicit mode 禁用 runtime DDL fallback。不执行 production migration，不删除生产兼容逻辑，除非 staging proof 和人工 approval 完成。

严格限制：
1. 不执行 production deploy。
2. 不执行 production D1 migration。
3. 不执行 remote D1 migration。
4. 不提交 secret。
5. 不删除 runtime DDL production fallback。
6. 不改财务公式。
7. 不改 dashboard live result。
8. 不把 P1-002 标记 production ready。

必须先读取：
- P1_002B_RUNTIME_DDL_REMOVAL_READINESS.md
- RUNTIME_DDL_REMOVAL_GATE_RESULT.md
- RUNTIME_DDL_STATUS.md
- RUNTIME_DDL_MIGRATION_PLAN.md
- D1_MIGRATION_ORDER.md
- RUNTIME_DDL_STATIC_SCAN.md

必须新增：
- local/staging runtime DDL disabled rehearsal script
- schema drift check
- rollback plan
- full smoke/auth/employee-entry verification

必须验证：
npm run check
npm run audit:runtime-ddl
npm run gate:runtime-ddl-removal
npm run verify:clean-d1
npm run smoke:with-worker
npm run security:secrets
```

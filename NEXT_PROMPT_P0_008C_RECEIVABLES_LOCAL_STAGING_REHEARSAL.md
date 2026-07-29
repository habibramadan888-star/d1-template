# NEXT PROMPT: P0-008C Receivables Local/Staging Rehearsal

Use only after P0-008B readiness gate review.

```text
进入 TASK P0-008C：Receivables local/staging implementation rehearsal.

目标：
创建 receivables 的 local/staging-only migration draft、pure module、tests 和 dry-run rehearsal，不执行 production/remote migration，不改 live dashboard，不替换 legacy arrears。

严格限制：
1. 不执行 production deploy。
2. 不执行 staging deploy，除非只是 dry-run 或人工批准的真实 staging QA。
3. 不执行 production D1 migration。
4. 不执行 remote D1 migration。
5. 不提交 secret。
6. 不切 live dashboard。
7. 不替换 live arrears/arrear_tasks。
8. 不改 live financial formula。
9. 不把 P0-008 标记 Verified。
10. 如果 tenant/property scope 或 accounting policy 需要人工决定，记录 blocker。

必须先读取：
- P0_008B_RECEIVABLES_IMPLEMENTATION_READINESS_GATE.md
- RECEIVABLES_READINESS_GATE_RESULT.md
- RECEIVABLES_MODEL_DESIGN.md
- RECEIVABLES_LIFECYCLE_TEST_PLAN.md
- MONEY_RECONCILIATION_GATE.md
- BACKEND_TOTALS_SOURCE_OF_TRUTH.md
- TENANCY_SCOPE_AUDIT.md

必须新增：
- migration-drafts/receivables_model_draft.sql
- modules/finance/receivables.mjs
- tests/receivables-lifecycle.spec.mjs
- scripts/rehearse-receivables-local-staging.mjs
- RECEIVABLES_LOCAL_STAGING_REHEARSAL_RESULT.md

必须验证：
npm run check
npm run gate:receivables
npm run test:money
npm run test:backend-totals
npm run security:secrets
```

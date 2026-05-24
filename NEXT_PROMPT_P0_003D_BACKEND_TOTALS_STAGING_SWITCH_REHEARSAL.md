# NEXT PROMPT: P0-003D Backend Totals Staging Switch Rehearsal

Use this prompt only after P0-003C gate is reviewed.

```text
进入 TASK P0-003D：Backend totals staging/local switch rehearsal.

目标：
在 local/staging 范围内为 owner dashboard / history totals 增加后端权威 totals 的 shadow 或 feature-flagged rehearsal，不切 production，不改 production dashboard，不改 live financial formula。

严格限制：
1. 不执行 production deploy。
2. 不执行 staging deploy，除非明确只做 dry-run 或已人工批准真实 staging QA。
3. 不执行 production D1 migration。
4. 不执行 remote D1 migration。
5. 不提交 secret。
6. 不把 frontend totals 当 authority。
7. 不静默 round 金额。
8. 不切 production dashboard。
9. 不把 P0-003 标记 Verified。
10. 如果需要 P0-008 receivables 或 P0-006 tenant scope 才能继续，记录 blocker。

必须先读取：
- P0_003C_BACKEND_TOTALS_LIVE_AUTHORITY_GATE.md
- BACKEND_TOTALS_LIVE_AUTHORITY_GATE_RESULT.md
- BACKEND_TOTALS_SOURCE_OF_TRUTH.md
- BACKEND_TOTALS_AUTHORITY_GATE.md
- MONEY_RECONCILIATION_GATE_RESULT.md
- RECEIVABLES_MODEL_DESIGN.md
- TENANCY_SCOPE_AUDIT.md

必须实现：
- local/staging-only backend totals shadow response or comparison script
- feature flag if touching any route
- dashboard unchanged tests
- discrepancy report
- rollback by flag off

必须验证：
npm run check
npm run test:backend-totals
npm run rehearse:backend-totals
npm run gate:backend-totals-live
npm run verify:dashboard-unchanged
npm run security:secrets
```

# Next Prompt: P0-001E Local/Staging Dual-Write Rehearsal

Use this after P1-006 drift gate review. If embedded Worker will be used for staging, complete P1-006B controlled write first.

```text
进入 TASK P0-001E：Local/staging-only money minor-unit dual-write rehearsal.

当前前置：
1. P0-001D-GATE 已完成。
2. P1-006 drift gate 已完成。
3. 不允许 production migration。
4. 不允许 remote D1 migration。
5. 不允许 production deploy。
6. 不允许 live dashboard switch。
7. 不允许 live employee handover switch。
8. 不允许删除 legacy decimal / REAL 字段。

目标：
在 local/staging-only 路径中演练 `*_fils` dual-write，不改变 live 财务结果。

允许：
1. 新增 local/staging migration 草案或本地测试表。
2. 新增 dual-write rehearsal endpoint/test harness。
3. 新增 dry-run backfill/reconciliation 脚本。
4. 新增 tests。
5. 更新报告和 gate。

禁止：
1. 不执行 production/remote D1 migration。
2. 不修改 live transactions/deposit_ledger/arrears 写入路径。
3. 不切换老板端 dashboard 到 minor units。
4. 不切换员工端 live handover。
5. 不做 P0-008 receivables 正式落地。
6. 不做 P0-006 tenant rewrite。

必须验证：
1. `npm run check`
2. `npm run smoke:with-worker`
3. `npm run verify:clean-d1`
4. `npm run test:money`
5. `npm run test:money-dual-write`
6. `npm run rehearse:money-dual-write`
7. `npm run gate:money-reconciliation`
8. `npm run test:backend-totals`
9. `npm run test:handover-staging-endpoint`
10. `npm run verify:dashboard-unchanged`
11. `npm run verify:handover-legacy-unchanged`
12. `npm run security:secrets`

完成后 P0-001 仍只能是 Partial，除非 live write/read paths 已经经人工批准切换并通过 reconciliation。
```

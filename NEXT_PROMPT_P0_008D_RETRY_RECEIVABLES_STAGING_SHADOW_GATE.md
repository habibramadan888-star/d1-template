# NEXT PROMPT: P0-008D Retry Receivables Staging Shadow Gate

Use only after `TEST-STABILITY-002` is committed and `npm run check` remains green.

```text
进入 TASK P0-008D-RETRY：Receivables staging shadow gate after Worker ECONNRESET stability fix.

当前状态：
TEST-STABILITY-002 已完成。
npm run check 已恢复通过。
employee-entry Worker ECONNRESET 未在连续复现和目标测试循环中复现。
P0-008 当前仍为 Partial - receivables local/staging rehearsal passed。

目标：
推进 P0-008D：receivables staging shadow gate。

严格禁止：
1. 不执行 production deploy。
2. 不执行 production migration。
3. 不执行 remote production D1 migration。
4. 不写 production D1。
5. 不调用 production URL。
6. 不开启 production feature flags。
7. 不修改 production wrangler config。
8. 不把 receivables 切到 production authority。
9. 不把 P0-008 标记为 Verified。
10. 不把 production cutover 标记为 GO。
11. 不删除 legacy arrears / arrear_tasks / transactions / sessions 逻辑。
12. 不删除 legacy fields。
13. 不静默替换老板端 dashboard result。
14. 不改变 live financial formula。
15. 不绕过金额校验。
16. 不静默 round 金额。
17. 不把 frontend totals 当成 accounting authority。
18. 不做 P0-006 tenant/property scope 重构。
19. 不提交 secret。
20. 不打印 password / token / cookie。

允许：
1. 新增 staging-only receivables shadow feature flag。
2. 新增 receivables shadow comparison script。
3. 读取 staging D1 做只读 shadow comparison。
4. 读取 legacy arrears / transactions / sessions 做 comparison。
5. 生成 dashboard future authority evidence。
6. 生成 due / overdue / outstanding shadow evidence。
7. 新增 tests。
8. 新增 reports。
9. 如果使用 feature flag，QA 后必须 rollback false。
10. production 继续 NO-GO。

baseline 必须先运行：
npm run format:check
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run test:receivables
npm run rehearse:receivables
npm run qa:employee-entry-staging

qa:employee-entry-staging 不加确认参数，必须保持 DRY_RUN_ONLY / MANUAL_REQUIRED。

完成后 P0-008 状态只能是：
Partial - receivables staging shadow gate passed
或：
Partial - receivables staging shadow gate blocked

禁止标记 Verified / Done / Fixed。
```

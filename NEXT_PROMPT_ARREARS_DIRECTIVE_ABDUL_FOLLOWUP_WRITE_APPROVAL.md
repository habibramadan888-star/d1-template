# Next Prompt: Abdul Follow-Up Production Write Approval

Use this only if Ramadan wants to approve exactly one employee follow-up production write for Abdul's already assigned existing arrears task.

```text
进入 TASK ARREARS-DIRECTIVE-ABDUL-FOLLOWUP-WRITE-APPROVAL-001：审批阿布杜单条员工反馈 production write。

当前状态：
- Abdul 已能在员工端看到老板下发任务。
- 当前 production write gate 关闭。
- 当前员工端提交反馈会被 409 approval gate 拦截，不写入生产。
- Production cutover 必须保持 PRODUCTION_NO_GO。

请 Ramadan 明确批准或拒绝：

1. 是否允许临时开启 production write gate：APPROVE / REJECT
2. 是否允许阿布杜只对这 1 条 directive 提交反馈：APPROVE / REJECT
3. task：144 / 139780080 / 50 AED
4. promised_payment_date：2026-06-10
5. followup_note：<填写阿布杜手机端真实备注>
6. 是否允许写入 idempotency/audit：APPROVE / REJECT
7. 是否 smoke 后立即关闭 write gate：APPROVE / REJECT
8. 是否确认 production cutover remains PRODUCTION_NO_GO：yes / no

严格禁止：
1. 不允许批量。
2. 不允许 TTLock。
3. 不允许修改金额。
4. 不允许修改 accounting_status。
5. 不允许 close/void/delete。
6. 不允许 production cutover。
7. 不允许打印 password/token/cookie/Set-Cookie。

如果批准，执行范围只能是：
- 临时打开 production write gate。
- 对 task 144 / 139780080 / 50 AED 执行一次 Abdul employee follow-up write。
- 记录 idempotency/audit 证据。
- 立即关闭 production write gate。
- 验证老板端可见反馈。
- 保持 PRODUCTION_NO_GO。

如果不批准，任务停止，不执行任何 production write。
```

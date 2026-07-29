# Next Prompt: Arrears Real Directive Delivery Approval Required

Use this only after explicit approval for real employee directive delivery writes.

```text
进入 TASK ARREARS-REAL-DIRECTIVE-DELIVERY-APPROVAL-REQUIRED：

目标：将老板端 dry-run 下发员工清单升级为真实 D1-backed directive delivery。

必须先确认：
1. 允许写入目标 D1。
2. 已备份并确认 rollback。
3. 明确允许调用 POST /api/arrear_tasks/directive。
4. 明确允许更新 arrear_tasks directive 字段。

禁止在未批准前执行：
- D1 write
- migration
- employee task creation/update
- real directive delivery

需要验证：
- 老板端选中任务后真实下发
- 员工端 GET /api/arrear_tasks 可读到 pending directive
- 员工提交 update 后 directive_status 变 promised
- audit/event 记录完整
- rollback 路径可执行
```


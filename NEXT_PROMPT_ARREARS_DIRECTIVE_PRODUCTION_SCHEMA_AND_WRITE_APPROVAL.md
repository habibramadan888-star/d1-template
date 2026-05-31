# Next Prompt: Arrears Directive Production Schema And Write Approval

仅在 Ramadan 明确逐项批准后，才复制下面文本进入下一轮。没有勾选批准时，Codex 不得执行任何 production migration、production write gate、production write smoke 或 production cutover。

```text
进入 TASK ARREARS-DIRECTIVE-PRODUCTION-SCHEMA-AND-WRITE-APPROVAL-001。

我明确授权 Codex 准备并执行以下最小 production-linked 操作，但必须先输出待执行命令、影响范围、回滚方式，并等待最终人工确认后再执行任何 production 操作。

请 Ramadan 逐项填写：

1. 是否允许 production schema migration：
   - [ ] YES
   - [ ] NO

2. 是否允许 temporary production write gate enable：
   - [ ] YES
   - [ ] NO

3. 是否允许 1 条 existing_arrears_record production smoke write：
   - [ ] YES
   - [ ] NO

4. 如果 schema 支持 ttlock_expired_unpaid persistent row，是否允许最多 1 条 ttlock production smoke write：
   - [ ] YES
   - [ ] NO

5. 是否允许 rollback / cleanup：
   - [ ] YES
   - [ ] NO

6. 是否确认 production cutover 仍保持 PRODUCTION_NO_GO：
   - [ ] YES
   - [ ] NO

必须人工填写的 smoke task ids：

existing_arrears_record task:
- task_id:
- room_bed:
- customer_code:
- amount:
- reason selected:

ttlock_expired_unpaid task（如果批准）:
- task_id:
- room_bed:
- customer_code:
- amount:
- source_ref:
- reason selected:

rollback snapshot:
- snapshot method:
- snapshot storage location:
- operator:
- approval timestamp:

write gate:
- enable operator:
- disable operator:
- expected open duration:

严格边界：
- production write smoke 不是 production cutover。
- 只允许最小范围 smoke。
- 所有 production write 必须使用 idempotency key、QA tag、audit，并具备 rollback。
- 不得修改 financial formula。
- 不得修改 dashboard calculation。
- 不得提交 secret。
- 不得打印 password/token/cookie。
- 不得把 commercial launch 改成 GO。
- 不得把任何 Partial P0 标记 Verified。
- 如果任一审批项不是 YES，Codex 不得执行对应 production 操作。
```

当前 schema 复核结论：`SCHEMA_MIGRATION_REQUIRED_BEFORE_WRITE_SMOKE`。

没有明确 checked approval 时，production migration/write/gate operations must not run.

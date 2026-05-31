# Next Prompt: Arrears Directive Production Schema And Write Approval

Copy/paste this only if Ramadan explicitly approves production-linked schema/write smoke.

```text
进入 TASK ARREARS-DIRECTIVE-PRODUCTION-SCHEMA-AND-WRITE-APPROVAL-001。

我明确批准 Codex 执行以下 production-linked 最小操作：

1. 是否允许 production schema migration：
   - [ ] YES
   - [ ] NO

2. 是否允许 temporary production write gate enable：
   - [ ] YES
   - [ ] NO

3. 是否允许 1 条 existing_arrears_record production smoke write：
   - [ ] YES
   - [ ] NO

4. 如果 production 已支持 ttlock_expired_unpaid persistent row，是否允许最多 1 条 ttlock production smoke write：
   - [ ] YES
   - [ ] NO

5. 是否允许 rollback / cleanup：
   - [ ] YES
   - [ ] NO

6. 是否确认 production cutover 仍保持 PRODUCTION_NO_GO：
   - [ ] YES
   - [ ] NO

严格要求：
- 不执行 production cutover。
- 不把 commercial launch 改成 GO。
- 不把 Partial P0 标记 Verified。
- 不修改 financial formula。
- 不修改 dashboard calculation。
- 不提交 secret。
- 不打印 password/token/cookie。
- 所有 production write 必须使用 idempotency key、QA tag、audit，并执行或准备 rollback。

请先输出待执行命令和影响范围，等待最终人工确认后再执行 production 操作。
```

Without explicit checked approval, production migration/write/gate operations must not run.

# Next Prompt: Arrears Directive Production Existing Arrears Smoke Approval

Copy this only if Ramadan explicitly approves a minimum production write smoke for one existing arrears record.

```text
进入 TASK ARREARS-DIRECTIVE-PRODUCTION-EXISTING-ARREARS-SMOKE-001。

当前 schema 结论：
SCHEMA_READY_FOR_EXISTING_ARREARS_WRITE_SMOKE

我明确批准 Codex 准备 1 条 existing_arrears_record production smoke write，但必须先输出待执行命令、影响范围、rollback snapshot、write gate 开关计划，并等待最终人工确认后再执行。

请 Ramadan 逐项填写：

1. 是否允许临时开启 production write gate：
   - [ ] YES
   - [ ] NO

2. 是否允许 1 条 existing_arrears_record production smoke write：
   - [ ] YES
   - [ ] NO

3. production task:
   - task_id:
   - room_bed:
   - customer_code:
   - amount:
   - assigned employee userid:
   - reason selected:

4. employee follow-up payload:
   - promised_payment_date:
   - followup_note:

5. idempotency keys:
   - owner directive idempotency key:
   - employee follow-up idempotency key:

6. rollback snapshot:
   - snapshot method:
   - snapshot storage location:
   - rollback operator:

7. write gate:
   - enable operator:
   - disable operator:
   - expected open duration:

8. QA tag:
   - qa_tag:

9. 是否确认 smoke 后立即关闭 write gate：
   - [ ] YES
   - [ ] NO

10. 是否确认 production cutover 仍保持 PRODUCTION_NO_GO：
   - [ ] YES
   - [ ] NO

严格禁止：
- 不执行 ttlock production smoke。
- 不修改 source_type/source_ref。
- 不执行 production cutover。
- 不把 commercial launch 改成 GO。
- 不把 Partial P0 标记 Verified。
- 不修改 financial formula。
- 不修改 dashboard calculation。
- 不提交 secret。
- 不打印 password/token/cookie。
```

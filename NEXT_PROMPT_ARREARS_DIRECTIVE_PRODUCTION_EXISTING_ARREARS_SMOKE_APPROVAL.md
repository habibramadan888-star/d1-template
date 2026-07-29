# Next Prompt: Arrears Directive Production Existing Arrears Smoke Approval

Copy this only if Ramadan explicitly approves a minimum production write smoke for one existing arrears record.

```text
进入 TASK ARREARS-DIRECTIVE-PRODUCTION-EXISTING-ARREARS-SMOKE-001。

当前 schema 结论：SCHEMA_READY_FOR_EXISTING_ARREARS_WRITE_SMOKE
当前 auth harness 结论：AUTH_SESSION_WRITE_APPROVAL_REQUIRED

我明确批准 Codex 执行 1 条 existing_arrears_record production smoke write，范围仅限以下输入。

必须先确认：
1. production cutover 继续保持 PRODUCTION_NO_GO。
2. 不执行 ttlock production smoke。
3. 不执行 batch write。
4. 不修改 financial formula。
5. 不修改 dashboard calculation。
6. 不打印 password/token/cookie/Set-Cookie。

## 认证执行方式

选择一种：

- [ ] 方案 A：人工浏览器 smoke。Ramadan 使用已有登录态操作，Codex 只记录结果，不接触 cookie/token。
- [ ] 方案 B：本地 masked API harness。Codex 使用 `.tmp/arrears-smoke-auth/production-auth.local.env`，只在内存中使用 cookie，禁止打印 secret。

如果选择方案 B，必须额外批准：

- [ ] 允许 owner 登录创建 production active_sessions row。
- [ ] 允许 employee 登录创建 production active_sessions row。
- [ ] 允许 smoke 后调用 logout/revoke session 写 `active_sessions.revoked=1`。
- [ ] 确认 `.tmp/arrears-smoke-auth/production-auth.local.env` 只保存在本机且不提交 Git。
- [ ] 允许 Codex 使用 masked auth harness，但禁止输出 password/token/cookie/Set-Cookie。

本地认证文件结构必须是：

- 老板：无登录名，只填写 `OWNER_PASSWORD`。
- 员工：填写 `EMPLOYEE_LOGIN_ID`、`EMPLOYEE_PASSWORD`、`EMPLOYEE_NAME`。
- 管理员：填写 `ADMIN_LOGIN_ID`、`ADMIN_PASSWORD`。

禁止事项：

- 不要把密码发到聊天。
- 不要截图认证文件。
- 不要写进 Markdown。
- 不要提交 Git。
- Codex 只能读取本机 ignored 文件，并且输出必须脱敏。
- 如登录会创建 `active_sessions`，必须另行批准 auth session write。

## Production write approval

1. 是否允许临时开启 production write gate：
   - [ ] YES
   - [ ] NO

2. 是否允许 1 条 existing_arrears_record production smoke write：
   - [ ] YES
   - [ ] NO

3. production task:
   - task_id: task-mpgzu9kp-f150e26f
   - room_bed: 144
   - customer_code: 139780080
   - amount: 50 AED
   - assigned employee userid: abdul
   - reason selected: lowest-risk existing arrears smoke candidate

4. employee follow-up payload:
   - promised_payment_date: 2026-06-01
   - followup_note: QA smoke：客户承诺测试日期付款，仅用于 production-linked 最小验证

5. idempotency keys:
   - owner directive idempotency key: qa-prod-arrears-owner-20260531T203913-task-mpgzu9kp-f150e26f
   - employee follow-up idempotency key: qa-prod-arrears-employee-20260531T203913-task-mpgzu9kp-f150e26f

6. rollback snapshot:
   - snapshot method: read-only pre/post snapshot of selected task, idempotency rows, audit rows, and write gate state
   - snapshot storage location: ARREARS_DIRECTIVE_PRODUCTION_PRE_SMOKE_SNAPSHOT.md
   - rollback operator: Ramadan Habib

7. write gate:
   - enable operator: Ramadan Habib
   - disable operator: Ramadan Habib
   - expected open duration: 10 minutes
   - maximum allowed open duration: 15 minutes

8. QA tag:
   - qa_tag: QA_PROD_ARREARS_DIRECTIVE_MIN_SMOKE

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
- 不打印 password/token/cookie/Set-Cookie。
```

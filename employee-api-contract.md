# 员工端后端接口契约

员工端目标是独立于老板端页面运行，但共享同一个 Cloudflare Workers 后端和同一个 D1 数据库。

## 数据迁移

先执行：

`migrations/001_employee_anchor_schema.sql`

说明：`entries` 新增字段全部允许为空，旧数据和旧老板端不会损坏。`arrear_tasks` 和 `entry_events` 是新增表，用于员工任务流和审计历史。

如果接入 `worker-employee-api-patch.js`，也可以由后端执行：

`POST /api/employee/migrate`

这个接口会先检查字段是否存在，再补字段和新表，适合避免手动重复执行 `ALTER TABLE` 报错。

## 录入接口

`POST /api/employee/entry`

请求：

```json
{
  "entry": {
    "id": "ent-xxx",
    "cat": "cash",
    "room": "431",
    "amount": 400,
    "tag": "New",
    "note": "备注",
    "period_start": "2026-05-18",
    "period_end": "2026-06-02",
    "cycle": "15D",
    "reason_code": "NEW",
    "operator_id": "A01",
    "src": "EMP",
    "tenant_name": "租客姓名",
    "created_at": "2026-05-22 00:00:00"
  }
}
```

后端行为：

保存到 `entries`，并写一条 `entry_events`：

`ref_type=entry`，`ref_id=entry.id`，`event_type=create`。

兼容性：

当前 `employee.html` 如果此接口不可用，会降级调用旧的 `/api/save_session`。

## 欠款任务列表

`GET /api/arrear_tasks`

返回：

```json
{
  "tasks": [
    {
      "task_id": "task-xxx",
      "entry_id": "ent-xxx",
      "bed": "431",
      "tenant_name": "租客姓名",
      "arrear_amount": 300,
      "arrear_reason": "续租尾款",
      "created_at": "2026-05-22 00:00:00",
      "followup_status": "待跟进",
      "promise_date": null,
      "promise_amount": null,
      "actual_received": 0,
      "close_status": null,
      "updated_by": null,
      "updated_at": null
    }
  ]
}
```

兼容性：

当前 `employee.html` 如果此接口不可用，会降级读取旧的 `/api/arrears`。

## 欠款跟进更新

`POST /api/arrear_tasks/update`

请求：

```json
{
  "task_id": "task-xxx",
  "patch": {
    "followup_status": "承诺付款",
    "promise_date": "2026-05-25",
    "promise_amount": 300,
    "actual_received": 0,
    "arrear_reason": "客户说明 5/25 支付",
    "updated_by": "A01",
    "updated_at": "2026-05-22 00:00:00"
  }
}
```

后端行为：

只更新传入字段，并把每个变化写入 `entry_events`：

`ref_type=arrear_task`，`ref_id=task_id`，`event_type=update`，记录 `old_value/new_value/operator_id/ts`。

## 状态建议

欠款状态建议固定为：

`待跟进`、`已联系`、`承诺付款`、`部分支付`、`结清`、`无法联系`。

这样老板端后续可以稳定统计：未跟进率、承诺回款、实际回款、逾期承诺、员工跟进效率。

# 员工端上线步骤

目标架构：

老板端继续使用 `/index.html`，员工端使用 `/employee.html`，两者共享同一个 Cloudflare Worker 和同一个 D1 数据库。

## 本地文件

- `employee.html`：员工端页面。
- `worker-employee-api-patch.js`：需要合并进现有 Worker 的后端接口。
- `migrations/001_employee_anchor_schema.sql`：手动 D1 迁移 SQL。
- `cf-assets-manifest.json`：已经加入 `/employee.html` 静态资产。
- `employee-api-contract.md`：接口和数据契约。

## Worker 接入

在现有 Worker 代码里加入 `worker-employee-api-patch.js` 的内容。

然后在主 `fetch` 处理函数里，放在静态资源 fallback 之前：

```js
const employeeResponse = await handleEmployeeApi(request, env, ctx);
if (employeeResponse) return employeeResponse;
```

如果现有 Worker 不是 ES Module，去掉补丁文件最后一行的 `export`，改成普通函数：

```js
async function handleEmployeeApi(request, env, ctx) {
  // 保持函数体不变
}
```

## 数据库迁移

优先方式：

部署后用老板/管理员登录态请求：

```text
POST /api/employee/migrate
```

这个接口会检查字段是否存在，再补字段和新表。

手动方式：

在 D1 控制台执行：

```text
migrations/001_employee_anchor_schema.sql
```

注意：手动 SQL 的 `ALTER TABLE ADD COLUMN` 只能跑一次；如果字段已存在会报错。重复迁移优先使用 `/api/employee/migrate`。

## 上线验证

1. 打开 `/employee.html`，应该不再是 404。
2. 点击“抓取床位”，应请求 `/api/lock/cards`。
3. 输入床位和金额，保存录入，应优先请求 `/api/employee/entry`。
4. 打开“欠款更新”，应请求 `/api/arrear_tasks`；如果新接口未启用，页面会降级读取旧 `/api/arrears`。
5. 保存欠款跟进，应请求 `/api/arrear_tasks/update`，并写入 `entry_events`。

## 风险点

- 旧老板端的 `index-51-main.js` 本地文件曾经被乱码污染，不要用它重建线上老板端资产。
- 现在 `cf-assets-manifest.json` 只追加了 `/employee.html`，没有重新编码旧 JS。
- 如果现有 Worker 的 D1 binding 不叫 `DB`，补丁会依次尝试 `DB`、`HOMELINK_DB`、`D1`。

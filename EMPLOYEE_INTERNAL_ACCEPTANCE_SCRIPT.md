# Employee Internal Acceptance Script

Generated: 2026-06-01 Asia/Dubai

Scope: employee UI and read/observational acceptance. Do not execute new production follow-up writes unless a separate approval explicitly allows it.

Production cutover status: `PRODUCTION_NO_GO`

| Step | Test | Expected | Result | Notes |
|---|---|---|---|---|
| EMP-001 | 登录阿布杜 | 进入员工端，不打印 token/cookie |  |  |
| EMP-002 | 打开跟进页面 | FOLLOW-UP 页面打开，无脚本错误 |  |  |
| EMP-003 | 检查老板下发任务模块 | 老板下发任务模块存在，和系统提醒分区清晰 |  |  |
| EMP-004 | 查找任务 144 / 139780080 / 50 AED | 任务可见，来源为系统已有欠款 |  |  |
| EMP-005 | 检查承诺日期 | 2026-06-10 可见 |  |  |
| EMP-006 | 检查备注 | 已保存备注可见 |  |  |
| EMP-007 | 已保存反馈点击 | 未修改时不误报写入未启用，显示已保存/老板端可见 |  |  |
| EMP-008 | 修改日期或备注 | 显示当前修改未提交 |  |  |
| EMP-009 | write gate off 提交修改 | 仅在点击提交后提示真实反馈写入未启用，且不写生产 |  |  |
| EMP-010 | 承诺金额输入 | 不显示承诺金额输入 |  |  |
| EMP-011 | 金额权限 | 不允许改金额、关闭、作废、交接、修改 accounting_status |  |  |
| EMP-012 | 打开录入 | 页面可打开；本脚本不执行真实录入写入 |  |  |
| EMP-013 | 打开导出 | 导出入口可打开，不乱码，不泄露 debug 字段 |  |  |
| EMP-014 | 退出登录 | 返回三道门，受保护页面不能继续访问 |  |  |

## Safety Checks

- Do not open production write gate.
- Do not execute employee follow-up write.
- Do not execute employee entry write.
- Do not execute handover.
- Do not print password/token/cookie/Set-Cookie.

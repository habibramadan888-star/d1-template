# Internal Acceptance Bug Triage Rules

Generated: 2026-06-01 Asia/Dubai

Production cutover status: `PRODUCTION_NO_GO`

## P0 - Stop Immediately

P0 defects block all internal acceptance progress until fixed and re-tested.

Examples:

- 登录完全失败。
- 数据错误，包括金额、欠款、已收、待收等核心财务数据错误。
- 权限绕过，例如 employee 或 readonly_admin 可以写入老板功能。
- 生产写入错误，包括未经批准写入、重复写入、写错任务。
- 欠款核心数据丢失。
- 页面完全不可用、白屏、关键页面无法打开。
- 密码、token、cookie、Set-Cookie 或 secret 泄露。

## P1 - Module Acceptance Blocker

P1 defects block the affected module from acceptance, but do not necessarily block unrelated modules.

Examples:

- 老板无法完成欠款查看。
- 员工无法看到老板下发任务。
- 员工无法反馈日期/备注。
- 老板无法看到员工反馈。
- WhatsApp 导出不可用。
- readonly_admin 可写。
- 分析、历史、客户等主模块入口丢失。
- 弱网/刷新导致关键模块无法恢复。

## P2 - UX / Clarity Defect

P2 defects affect理解、操作效率或移动端体验，应按 UX polish 批次修复。

Examples:

- 排版影响理解。
- 文案误导。
- 按钮状态不清楚。
- 字段多余、debug 字段显示。
- 移动端阅读困难。
- 空状态或错误状态不清晰。

## P3 - Visual Polish

P3 defects are non-blocking visual improvements.

Examples:

- 字体、颜色、间距微调。
- 图标细节。
- 文案轻微优化。
- 跨页面视觉一致性细节。

## Reporting Rule

Every bug report must include:

- Role.
- Page.
- Steps.
- Expected.
- Actual.
- Severity.
- Screenshot or screen recording when mobile UI is involved.

Do not randomly fix from screenshots. First classify, group by module, then create a focused fix batch with tests.

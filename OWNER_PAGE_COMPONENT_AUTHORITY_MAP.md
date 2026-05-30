# Owner Page Component Authority Map

Date: 2026-05-30, Asia/Dubai

Scope: owner page composition authority for overview and arrears follow-up. This file is the source of truth for preventing future UI regressions. Production cutover remains `PRODUCTION_NO_GO`.

## Owner Overview 允许显示

- 今日实收
- 待收尾款摘要
- 今日待处理
- 最近交接
- 异常提醒
- 待收尾款摘要列表
- 最近会话
- 最近流水摘要

## Owner Overview 禁止显示

- 快速进入
- QUICK ACTIONS
- 历史快捷按钮
- 客户快捷按钮
- 分析快捷按钮
- 网络快捷按钮
- ADD ENTRY
- 录入收款
- 录入押金
- 作废

## Owner Arrears 必须显示

- 欠款管理
- ARREARS FOLLOW-UP
- 待下发
- 跟进中
- 承诺逾期
- 待核对
- 欠款任务列表
- 下发员工入口
- WhatsApp 导出
- 任务状态
- 负责人
- 承诺还款日期
- 备注
- 老板审核动作

## Owner Arrears 禁止显示

- debug 字段
- directive: none
- promise: 原始字段名
- staff: 原始字段名
- 主列表直接显示录入收款/录入押金/作废

## Regression Policy

- If owner overview renders `QUICK ACTIONS` or `快速进入`, treat it as a regression bug.
- If owner internal arrears entry disappears, treat it as a regression bug.
- If the three-door login portal shows arrears management as a fourth identity, treat it as a regression bug.
- If arrears follow-up information pool is not visible from owner internal navigation, treat it as a regression bug.

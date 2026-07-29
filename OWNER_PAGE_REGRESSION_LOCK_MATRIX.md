# Owner Page Regression Lock Matrix

Production cutover remains `PRODUCTION_NO_GO`.

## 总览

Must include: 今日实收, 待收尾款, 今日待处理, 最近交接, 异常提醒.

Forbidden: QUICK ACTIONS, 快速进入.

## 欠款

Must include: 欠款任务池, 系统已有欠款, 通通锁到期未付, 员工承诺金额/日期/备注, WhatsApp 导出.

Forbidden: debug 字段, 旧 table 竖排, signal abort error.

## 历史

Must include: 记录分组, 查看详情.

Forbidden: 30 秒空白.

## 分析

Must include: 分析入口存在, 分析页面可打开.

## 客户

Must include: 客户信用档案.

## 网络

Must include: 入口可访问.

## Required Smoke

Any owner shell change must run `npm run test:owner-regression-smoke` before deploy.

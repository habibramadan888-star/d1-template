# Arrears Export Format Redesign

The arrears export now uses a summary-first accounting format:

```text
青旅｜逾期欠款清单
生成时间：YYYY/MM/DD HH:mm
统计范围：已过期
总计：N 人
最久逾期：N 天
需优先跟进：逾期超过 14 天共 N 人

一、逾期汇总
- 逾期 1-7 天：N 人
- 逾期 8-14 天：N 人
- 逾期 15 天以上：N 人

二、明细
1. 房间/床位：...
   租客/卡片：...
   截止日期：...
   逾期天数：...
   金额：金额未接入
   状态：...
   建议动作：...

三、备注
- 本清单仅用于内部跟进。
- 金额字段如显示“金额未接入”，需以财务流水为准。
```

Design decisions:

- Removed ASCII box art and separator walls.
- Removed empty `update:` fields.
- Preserved the existing overdue classification logic.
- Explicitly marks unknown amount as `金额未接入`.
- Keeps output copy-friendly for WhatsApp, WeChat, and accounting review.

# Owner Arrears Card Information Redesign Result

Production cutover remains `PRODUCTION_NO_GO`.

The owner arrears card now shows only owner-relevant information:

1. Identity and amount: `#customer | bed | amount AED`.
2. Source and due status: `系统已有欠款` or `通通锁到期未付`, overdue/due date, and package/card code.
3. Employee feedback:
   - `承诺金额`
   - `承诺日期`
   - `备注`
4. Business status:
   - `待下发`
   - `已下发`
   - `已跟进`
   - `承诺付款`
   - `承诺逾期`
   - `已反馈付款`
   - `待核对`
   - `已关闭`

The card does not render raw JSON/debug fields such as `directive`, `promise`, `staff`, `source_type`, `followup_status`, `accounting_status`, `none`, `undefined`, or `null`.

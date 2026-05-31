# OWNER_ARREARS_REMOVE_PROMISED_AMOUNT_RESULT

## Result

Owner arrears cards no longer show the employee promised amount field in the default card, detail alert, or WhatsApp export text.

The arrears amount remains visible only in the card title, using the existing system arrears amount or bed-rent-mapped TTLock amount.

| Check                          | Result |
| ------------------------------ | ------ |
| `承诺金额` field still shown   | no     |
| top arrears amount still shown | yes    |
| amount calculation changed     | no     |
| employee workload reduced      | yes    |

## Changed UI

Before:

```text
承诺金额：未填写
承诺日期：未填写
备注：暂无
状态：待下发
```

After:

```text
承诺日期：未填写
备注：暂无
状态：待下发
```

## Safety

No database field was removed. No API field was removed. No D1 command, migration, employee write, handover, void, or delete action was run.

# Employee Arrears Follow-up Button Copy Result

Date: 2026-06-01 Asia/Dubai

## Button Copy Rules

| State | Button / Toast |
|---|---|
| No persisted feedback | `提交反馈` |
| Persisted feedback, unchanged inputs | `已保存`; clicking path does not show gate-off warning |
| Persisted feedback, edited inputs | `提交修改` |
| Write gate off with dirty edit | `真实反馈写入未启用；当前修改不会写入生产。请先用 WhatsApp/线下回执。` |
| Write gate off with new feedback | `真实反馈写入未启用；当前不会写入生产。请先用 WhatsApp/线下回执。` |
| Persisted feedback unchanged click | `反馈已保存，老板端可见。` |

## Safety

- No production write was executed.
- No write gate was opened.
- No password, token, cookie, or Set-Cookie was printed.
- Production cutover remains `PRODUCTION_NO_GO`.

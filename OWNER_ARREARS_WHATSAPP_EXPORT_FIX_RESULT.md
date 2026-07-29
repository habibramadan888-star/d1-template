# Owner Arrears WhatsApp Export Fix Result

| Check | Result |
|---|---|
| 点击是否有反应 | yes |
| 是否复制成功 | yes, when browser clipboard allows |
| 是否有失败 fallback | yes |
| 是否来自 Backend SOT | yes, via normalized current arrears rows |
| 是否支持当前筛选 | yes |
| 是否写 D1 | no |

Implementation notes:
- Export uses `ownerArrearsFilteredRows()`.
- It attempts clipboard copy, opens WhatsApp, and shows a manual textarea fallback if popup/clipboard is blocked.
- No write APIs are called.

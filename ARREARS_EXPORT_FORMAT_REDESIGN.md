# Arrears Export Format Redesign

Final user-confirmed WhatsApp export format:

```text
Due 5/29 | 11 overdue
---

【1-102】
134  4d🔥  D200  0525

【2-219】
219  21d🔥  D200  0808
4014  21d🔥  D200  0808
```

Design decisions:

- Default export is grouped by bed/room, not apartment or aging severity.
- Group header format is `【bed】`.
- Each tenant/card record is one short line.
- Line format is `customer-id  due-status  amount-code  date-code`.
- Customer id is first for WhatsApp search.
- `Due` means due today.
- `1d` has no fire marker.
- `Xd🔥` is used only when `overdueDays > 1`.
- Removed old categories such as `重点`, `核对`, and general follow-up labels.
- Removed Chinese field labels, remarks, `update`, and missing-amount prose.
- Calculation logic was not changed; this is export presentation only.

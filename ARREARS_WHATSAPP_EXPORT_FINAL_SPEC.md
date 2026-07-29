# Arrears WhatsApp Export Final Spec

Status: final export design only

## Default Mode

Default employee WhatsApp export mode is `staff_whatsapp_short`.

## Sample Format

```text
Due 5/29 | 11 overdue

【1-102】
134  4d🔥   D200  0525

【2-219】
219  21d🔥  D200  0808
4014 21d🔥  D200  0808

【3-103】
325  22d🔥  D100  1207p0508p23

【4-204】
4210 Due   D20   0329

【6-126】
641  3d🔥   D200  0226
636  1d    D200  1028

【8-202】
836  2d🔥   D200  0427
816  1d    D150  0428
821  1d    D150  0428
835  Due   D0    0514

【9-401】
9321 1d    D100  0428
```

## Rules

1. Group by bed or room.
2. One record per line.
3. Customer code appears first for WhatsApp search.
4. `overdueDays > 1` adds `🔥`.
5. `overdueDays = 1` does not add `🔥`.
6. `Due` does not add `🔥`.
7. Do not display priority labels such as key/check/general follow-up.
8. Do not display amount-not-integrated warnings.
9. Do not display long notes.
10. Do not display Chinese explanation in staff short export.
11. Do not use an `update` field.
12. Do not change arrears calculation logic.

## Export Modes

| Mode                   | Audience          | Purpose                            |
| ---------------------- | ----------------- | ---------------------------------- |
| `staff_whatsapp_short` | Employee          | Default execution list             |
| `owner_summary`        | Owner             | Management summary                 |
| `accounting_review`    | Accounting review | Payment/receivable matching review |

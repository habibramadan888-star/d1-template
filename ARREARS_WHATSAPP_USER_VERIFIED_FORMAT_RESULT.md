# Arrears WhatsApp User Verified Format Result

Date: 2026-05-31

## Locked Format

```text
Due Follow-up | M/D HH:mm | N overdue
============================
【room_bed】
customer_code  overdue_status  package_or_amount  date_code
```

Example:

```text
Due Follow-up | 5/29 13:43 | 11 overdue
============================
【1-102】
134  4d*  D200  0525

【2-219】
219  21d* D200  0808
4014 Due  D200  0808
```

## Rules

- Group by bed using `【bed】`.
- One task per row.
- ASCII spaces between fields.
- No bullets.
- No emoji.
- No raw `source_type`.
- No `ttlock_card`.
- No `rent` / `deposit` raw labels.
- No internal ids.
- Overdue greater than one day uses `*`.
- Search codes remain continuous.
- Clipboard, WhatsApp share URL, and fallback modal use the same text.
- Selected rows export selected rows; empty selection exports current filter.
- Rows are de-duplicated before composing text.

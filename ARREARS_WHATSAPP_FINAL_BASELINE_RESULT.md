# Arrears WhatsApp Final Baseline Result

Date: 2026-05-31

Final staff follow-up export format is locked as:

```text
Due M/D | N overdue
---
【room_bed】
customer_code  overdue_status  package_or_amount  date_code
```

Rules:

1. First line is `Due M/D | N overdue`.
2. Second line is `---`.
3. Each room/bed group is rendered as `【room_bed】`.
4. Each task line is `customer_code  overdue_status  package_or_amount  date_code`.
5. `overdue_status` is one of `Due`, `1d`, or `Nd*`.
6. `*` is used as the urgent marker; emoji is not used.
7. Raw backend/source fields are excluded from the WhatsApp text.
8. Internal IDs and `#ttlock-expired` values are excluded.
9. `undefined`, `null`, and `none` are excluded.
10. Duplicate rows are removed before text composition.

Safety:

- Backend SOT changed: No
- D1 write: No
- Migration: No
- Deploy: No
- Production cutover: PRODUCTION_NO_GO

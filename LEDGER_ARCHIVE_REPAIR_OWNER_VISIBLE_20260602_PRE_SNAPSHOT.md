# Ledger Archive Repair Owner Visible 2026-06-02 Pre Snapshot

## Target

| Field | Value |
|---|---|
| row id | mr4ta05v3t5fm |
| corpid | homelink |
| anchor_id | LGC-2026-06-02-TUGRBS |
| date | 2026-06-02 |
| table | sessions |
| database | homelink production D1 |

## Pre-Repair Row

| Field | Value |
|---|---|
| id | mr4ta05v3t5fm |
| corpid | homelink |
| anchor_id | LGC-2026-06-02-TUGRBS |
| date | 2026-06-02 |
| entries_count | 10 |
| created_by | manager |
| created_at | 2026-07-03 12:19:13 |
| operator_id | manager |
| operator_name | manager |
| cash_handover | null |
| bank_transfer_total | null |
| bank_transfer_count | null |
| gross_received | null |
| handover_status | COMPLETED |
| exported_at | 2026-07-03 12:19:13 |
| export_text_len | 0 |
| source | BOSS |
| voided_at | null |
| voided_by | null |
| void_reason | null |
| void_source | null |

## Existing Transaction Rows

| cat | count | amount |
|---|---:|---:|
| bank | 3 | 2160 |
| cash | 6 | 4360 |
| refund | 1 | 200 |

## Rollback

If post-verify fails, restore only this row:

```sql
UPDATE sessions
SET export_text = NULL,
    entries_count = 10,
    cash_handover = NULL,
    bank_transfer_total = NULL,
    bank_transfer_count = NULL,
    gross_received = NULL
WHERE id = 'mr4ta05v3t5fm'
  AND corpid = 'homelink'
  AND anchor_id = 'LGC-2026-06-02-TUGRBS'
  AND substr(date,1,10) = '2026-06-02';
```

## Safety

- Snapshot source: production read-only D1 query before repair.
- Production write before snapshot: No.
- Migration: No.
- Production cutover: PRODUCTION_NO_GO.

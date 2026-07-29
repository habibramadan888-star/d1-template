# Ledger Archive Repair 2026-06-02 Pre Snapshot

## Target

| Field | Value |
|---|---|
| row id | mpwymtw393u6b |
| anchor_id | APT-20260602-H6HKWZ |
| date | 2026-06-02 22:30:52 |
| table | sessions |
| database | homelink production D1 |

## Pre-Repair Row

| Field | Value |
|---|---|
| id | mpwymtw393u6b |
| corpid | ww234886c0e293d12e |
| anchor_id | APT-20260602-H6HKWZ |
| date | 2026-06-02 22:30:52 |
| entries_count | 14 |
| created_by | staff |
| created_at | 2026-06-02 18:30:53 |
| operator_id | null |
| operator_name | null |
| cash_handover | null |
| bank_transfer_total | null |
| bank_transfer_count | null |
| gross_received | null |
| handover_status | null |
| exported_at | null |
| export_text_len | 0 |
| source | null |
| voided_at | null |
| voided_by | null |
| void_reason | null |
| void_source | null |

## Existing Transaction Rows

| cat | count | amount |
|---|---:|---:|
| bank | 3 | 2160 |
| cash | 8 | 4860 |
| expense | 1 | 5 |
| refund | 2 | 400 |

## Rollback

If post-verify fails, restore only this row:

```sql
UPDATE sessions
SET export_text = NULL,
    entries_count = 14,
    cash_handover = NULL,
    bank_transfer_total = NULL,
    bank_transfer_count = NULL,
    gross_received = NULL
WHERE id = 'mpwymtw393u6b'
  AND anchor_id = 'APT-20260602-H6HKWZ'
  AND substr(date,1,10) = '2026-06-02';
```

## Safety

- Snapshot source: production read-only D1 query before repair.
- Production write before snapshot: No.
- Migration: No.
- Production cutover: PRODUCTION_NO_GO.

# Bed Transfer Record-Only Save API Result

Date: 2026-06-01

## Result

`POST /api/employee/bed-transfers` now creates Bed Transfer event ledger records with `status = recorded`.

| API Behavior | Result |
|---|---|
| Required fields | `from_bed`, `to_bed`, `transfer_date`, `reason`, `note`, `Idempotency-Key` |
| Saved status | `recorded` |
| Response message | `Bed transfer recorded / 换床记录已保存` |
| Review required flag | `false` |
| Idempotency evidence | Preserved |
| Audit evidence | Preserved |
| Trace evidence | Preserved |
| Business state mutation | No |

## Schema Note

Existing remote D1 tables created before this change require `migrations/006_bed_transfer_recorded_status.sql` before they can accept `status = recorded`.

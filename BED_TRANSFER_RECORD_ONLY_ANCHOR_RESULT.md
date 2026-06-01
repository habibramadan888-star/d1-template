# Bed Transfer Record-Only Anchor Result

Date: 2026-06-01

## Result

Record-only Bed Transfer keeps accounting and operational anchors for later audit/analysis without mutating source-of-truth business state.

| Anchor | Purpose |
|---|---|
| `from_bed` / `to_bed` | Movement trace |
| `customer_code` / `customer_display_name` | Tenant trace |
| `original_deposit_amount_fils` | Deposit snapshot |
| `carry_over_arrears_fils` | Arrears snapshot |
| `old_ttlock_ref` | TTLock/card snapshot |
| `audit_id` / `trace_id` | Audit and event trace |
| `idempotency_key` | Replay safety |

## Statistical Anchors

The documentation now uses snapshot-oriented anchors such as `transfer_with_deposit_snapshot_count` and `transfer_with_ttlock_snapshot_count`, not owner-review burden metrics.

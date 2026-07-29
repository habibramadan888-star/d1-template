# Bed Transfer Fee Ledger Save Result

Date: 2026-06-01

`POST /api/employee/bed-transfers` now supports:

```json
{
  "from_bed": "103",
  "to_bed": "111",
  "transfer_date": "2026-06-01",
  "fee_mode": "charged",
  "amount_fils": 5000,
  "waiver_reason": "",
  "reason": "customer_request",
  "note": "employee note",
  "idempotency_key": "..."
}
```

Save behavior:

| Item | Result |
|---|---|
| charged amount | `5000` fils |
| waived amount | `0` fils |
| waiver reason required | yes |
| `bed_transfer_events` | writes fee mode, amount, waiver reason, category, entry event id |
| `entry_events` | writes `event_type=bed_transfer`, `field_name=bed_transfer_fee` |
| audit log | writes action `employee.bed_transfer.create` with fee anchors |
| idempotency | records response via existing idempotency helper |
| owner review | not required |
| occupancy mutation | none |
| deposit mutation | none |
| arrears clearing | none |
| TTLock mutation | none |

Response copy:

- Charged: `Bed transfer recorded. Fee: 50 AED / 换床记录已保存，已记录 50 AED 换床费。`
- Waived: `Bed transfer recorded. Fee waived / 换床记录已保存，费用已豁免。`

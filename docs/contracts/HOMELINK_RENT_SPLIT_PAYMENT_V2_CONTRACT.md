# Homelink Rent Split Payment V2 Contract

## Status and rollout boundary

`rent_entry_v2` is an additive Rent-only contract. It is enabled only when the authenticated Worker returns `rent_split_payment_v2_enabled=true`. The first rollout is restricted to the isolated QA acceptance environment. Production keeps the capability absent or false until a later promotion task.

This contract does not add a table, column, index, migration, or new business event. It preserves one Rent business Entry, one canonical parent anchor, one aggregate compatibility transaction, one Owner History row, and one Finance business amount.

## Canonical shape

```json
{
  "contract_version": "rent_entry_v2",
  "entry_id": "E-QA-RENT-MIXED-001",
  "event_type": "rent",
  "bed": "7210",
  "due": 730,
  "paid": 730,
  "outstanding": 0,
  "payment_method": "mixed",
  "payment_legs": [
    {
      "leg_id": "E-QA-RENT-MIXED-001-BANK",
      "parent_entry_id": "E-QA-RENT-MIXED-001",
      "method": "bank",
      "amount_aed": 30
    },
    {
      "leg_id": "E-QA-RENT-MIXED-001-CASH",
      "parent_entry_id": "E-QA-RENT-MIXED-001",
      "method": "cash",
      "amount_aed": 700
    }
  ]
}
```

## Identity and normalization

1. The Entry ID and canonical anchor are the only business identities.
2. A payment leg is a child funding fact. It is never a standalone Entry, History row, transaction, arrears item, or Todo.
3. The canonical leg order is `bank`, then `cash`, with `leg_id` as the final stable tie-breaker.
4. A v2 leg ID is deterministic: `<parent Entry ID>-BANK` or `<parent Entry ID>-CASH`.
5. Every leg carries the exact parent Entry ID.
6. Amounts are numeric AED values rounded to two decimals. Numeric strings, `NaN`, infinity, negative values, zero-value mixed legs, and values with more than two decimal places are rejected.
7. Mixed payment contains exactly two positive legs using different methods: one `cash` and one `bank`.
8. Duplicate methods, duplicate leg IDs, unknown methods, unknown fields, or an unexpected leg count fail closed.
9. The exact sum of canonical legs must equal the parent `paid` amount at two-decimal AED precision.
10. Legacy single-channel Rent is normalized in memory to one virtual leg for projection only. Existing rows are not backfilled or rewritten.

## Fingerprint and idempotency

The Rent canonical business fingerprint includes:

- parent Entry identity and existing stable Rent business fields;
- contract version;
- expected Rent and paid amount;
- period and bed context;
- canonical sorted payment legs including leg ID, parent Entry ID, method, and two-decimal amount.

Server timestamps, transport controls, display-only summaries, and client-provided canonical IDs are excluded. An identical retry resolves to the existing parent anchor. Changing a payment method, leg amount, leg ID, or parent reference under the same Entry identity changes the fingerprint and must conflict. Any payload change invalidates an earlier validation attestation.

## Persistence

- `sessions.entries_json`: one `rent_entry_v2` parent anchor with the canonical `payment_legs` array.
- `sessions.entries_count`: counts the parent once.
- `transactions`: one aggregate compatibility row keyed by the parent Entry ID. For a mixed Rent its channel marker is `mixed`; its amount, due, and paid remain parent totals.
- No physical transaction row is created per leg.
- Session finalization and response-loss resume rebuild from the same parent anchor and remain idempotent.

## Financial semantics

For a Rent with Due AED 730, Cash AED 700, and Bank AED 30:

- Cash Received: AED 700
- Bank Received: AED 30
- Total Received: AED 730
- Rent Income: AED 730
- Outstanding: AED 0
- Arrears Opened: AED 0
- Parent business rows: 1
- Canonical anchors: 1
- Aggregate transactions: 1

Finance channel totals come from the legs. Total Received, Rent Income, Due, Paid, Outstanding, Arrears, History count, and Detail count come from the parent exactly once. A projection that produces AED 1,460 for the example above is invalid.

For short payment, `outstanding = max(due - paid, 0)` and the existing Rent arrears/Todo rules apply once to the parent. For excess payment, the existing excess handling applies once to the parent. Funding legs never create arrears or Todo independently.

## Employee and Owner presentation

- Rent exposes Cash, Bank, and Cash + Bank only when the server capability is enabled.
- Mixed mode records both positive channel amounts and displays their sum as Paid.
- Add, Edit, Copy, draft restore, login restore, Current Session, Header, Sticky Summary, Preview, Validate, Upload, and response-loss resume preserve the same parent Entry identity and canonical legs.
- Owner History, Detail, and Period Analysis show one Rent business row, decorated with Cash and Bank funding amounts.
- Other six Employee event contracts are unchanged.

## Gate and failure contract

The Worker is authoritative. The client cannot enable the feature by sending a flag.

- QA: `QA_ACCEPTANCE_ENABLED=true` and `RENT_SPLIT_PAYMENT_V2_ENABLED=true` are both required.
- Production: the capability is absent or false.
- A v2 or mixed payload received while the gate is closed fails with `RENT_SPLIT_PAYMENT_V2_DISABLED`.
- Malformed legs fail with a bounded, field-specific validation error and produce zero formal writes.

## Rollback

Before any v2 Entry is accepted outside QA, rollback is gate-only: turn the writer capability off. Readers remain v2-aware so already accepted QA evidence can still be audited. The runtime must never delete, flatten, or silently reinterpret a persisted v2 parent anchor.

# Owner History Correction-Aware Plan V1

Date: 2026-07-08

Status: planning only. No runtime owner parser changes. No production apply enablement. No x6wio correction. No production data changes. No migration. No deploy.

## 1. Purpose

Owner History must become correction-aware before production correction apply is enabled. Owners need a safe way to see original facts and future correction facts side by side before any adjusted business view becomes authoritative.

Owner History must be able to show:

- original total
- correction total
- adjusted total
- original events
- correction events
- audit trail

Original employee events remain immutable. Correction anchors are additive owner/system facts. They must never overwrite, hide, or hard-delete original employee source events.

## 2. Owner History Display Modes

### A. Raw Mode

Raw mode shows original sessions only. This is the existing behavior and remains the safe fallback.

Raw mode rules:

- Show original employee sessions and owner uploads.
- Show original session totals as stored.
- Do not apply correction anchors.
- Do not hide original duplicate or disputed rows.

### B. Adjusted Mode

Adjusted mode applies active correction anchors to totals.

Adjusted mode rules:

- Calculate `adjusted_totals = raw_totals + correction_totals`.
- Keep original events visible in audit-accessible data.
- Mark adjusted values as adjusted, not raw.
- Do not silently replace raw totals until adjusted mode is explicitly verified.

### C. Audit Mode

Audit mode shows:

- original session
- correction session
- linked correction events
- adjusted totals
- correction reason and evidence
- owner authorization fields

Default recommendation:

The first implementation should expose raw, correction, and adjusted data fields without silently replacing existing visible raw totals. Default visible totals should remain raw until the adjusted view is LIVE_VERIFIED and explicitly accepted.

## 3. Correction Session Discovery

Correction sessions are stored using the existing `sessions` / `export_text` mechanism.

Owner parser must detect correction sessions by:

- text marker: `HOMELINK OWNER CORRECTION`
- JSON block marker: `==== CORRECTION ANCHORS JSON ====`
- required contract: `anchor_contract_version = owner_correction_anchor_v1`

Parser must link correction sessions to:

- `target_session_id`
- `target_session_anchor`
- `original_event_id`
- `correction_event_id`

Parser must ignore correction sessions from another `corpid` / tenant.

## 4. Correction Application Rules

Only apply correction anchors if:

- `status = applied`
- `no_hard_delete = true`
- `original_events_immutable = true`
- target session exists
- `original_event_id` exists in target session
- correction event not reversed
- correction event not voided
- correction does not use forbidden identity
- correction belongs to the same `corpid`

Do not apply:

- pending correction
- rejected correction
- reversed correction
- voided correction
- correction missing `original_event_id`
- correction with invalid `financial_effect`
- correction targeting another company / `corpid`
- correction depending on `card_id`, `tenant_card_id`, provider phone, access-card metadata phone, hardware card id, or `99099` identity

## 5. Financial Aggregation Model

Owner summary must calculate:

`raw_totals`

From original employee sessions / owner uploads only.

`correction_totals`

Sum of active correction anchors linked to those original sessions.

`adjusted_totals`

`raw_totals + correction_totals`

Required fields:

- `cash`
- `bank`
- `gross`
- `rent_income`
- `deposit_liability`
- `arrears_repaid`
- `arrears_open`
- `expense`
- `transfer_fee`

Aggregation rules:

- Do not infer correction amounts from free text.
- Use correction anchor `financial_effect`.
- Do not double-apply the same `correction_event_id`.
- Do not apply the same correction to the same `original_event_id` twice.
- Preserve raw totals for comparison and audit.

## 6. x6wio Display Example

Future correction target:

- `EMPV3-20260707-abdul-x6wio`
- `S20260707-x6wio`

Raw:

- `cash = 1550`
- `gross = 1550`
- `rent_income = 1470`
- `arrears_repaid = 80`

Correction:

- `cash_delta = -1470`
- `gross_delta = -1470`
- `rent_income_delta = -1470`

Adjusted:

- `cash = 80`
- `gross = 80`
- `rent_income = 0`
- `arrears_repaid = 80`

Display must show original events:

1. `#334 arrears_payment 80`
2. `#334 rent 700 duplicate`
3. `#134 rent 770 duplicate`

Display must show correction events:

1. `void #334 rent 700`
2. `void #134 rent 770`

Adjusted session total:

- `80`

## 7. Owner Summary Impact

Corrections may affect:

- daily total
- employee total
- cash total
- bank total
- rent income
- arrears repayment total
- deposit liability
- expense total
- transfer fee total

Owner summary must distinguish:

- `raw_totals`
- `correction_totals`
- `adjusted_totals`

Do not silently hide raw totals. Adjusted totals must be visibly labeled and auditable.

## 8. Audit Requirements

Owner History detail should expose an audit trail containing:

- correction anchor id
- correction session id
- correction type
- correction reason
- evidence summary
- `authorized_by`
- `applied_at`
- `idempotency_key`
- `preview_hash`
- linked `original_event_id`
- `financial_effect`

Original records remain visible. In audit mode, corrected original records may be marked corrected / voided by correction, but the original source row must remain visible and unchanged.

## 9. Safety and Fallback Rules

If correction parsing fails:

- do not corrupt original history
- raw mode must still work
- adjusted mode should report warning
- correction should be marked invalid / unresolved
- do not partially apply ambiguous correction

If correction target is not found:

- correction session remains visible as unresolved
- do not apply financial effect

If duplicate correction is detected:

- fail closed
- do not double subtract
- mark correction conflict for audit review

## 10. No-Go Conditions

Implementation must stop if:

- parser would mutate original sessions
- parser would hide original source events
- parser cannot link correction to `original_event_id`
- parser could double-apply correction
- adjusted totals cannot be reconciled
- correction parsing breaks old owner history
- implementation requires migration
- implementation requires enabling production apply
- implementation depends on `card_id`, `tenant_card_id`, provider phone, hardware card id, access-card metadata phone, or `99099` identity

## 11. Future Implementation Phases

H4A:

Fixture-only correction-aware owner parser tests.

H4B:

Runtime Owner History response includes `raw_totals`, `correction_totals`, and `adjusted_totals`, but does not change default visible totals yet.

H4C:

Owner detail audit mode displays original + correction + adjusted.

H4D:

After live verification, allow controlled correction apply.

H4E:

Optional UI polish.

## 12. Required Future Tests

Future tests:

- old owner history without corrections unchanged
- parse correction sessions
- link correction to target session
- x6wio adjusted total = `80` with fixture correction session
- original events visible
- correction events visible
- raw totals unchanged
- adjusted totals correct
- duplicate correction not double-applied
- invalid correction ignored with warning
- pending / rejected corrections not applied
- reversed corrections not applied
- forbidden identity rejected
- owner parser regression passes
- daily summary raw / adjusted separation
- employee summary raw / adjusted separation
- no migration
- no production write

## 13. Recommended Next Step

GO_TO_H4A_FIXTURE_OWNER_HISTORY_PARSER_IMPLEMENTATION

H4A should be fixture-only first. It should not change runtime Owner History behavior until the correction-aware parser proves raw, correction, and adjusted totals with x6wio-style fixtures.

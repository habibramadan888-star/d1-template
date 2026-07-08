# Owner History Response Fields H4B Plan V1

Status: planning only.

This document audits the current Owner History runtime endpoints and defines a safe H4B implementation plan for additive correction-aware response fields. It does not implement runtime Owner History response changes.

## 1. Purpose

H4B will expose correction-aware data fields in Owner History API responses while preserving existing raw totals and current owner UI behavior.

The goal is additive response fields only. Existing visible totals remain raw/source totals by default. H4B must not silently replace current top-level totals, hide original employee events, enable production correction apply, write production data, add a migration, or change owner UI.

## 2. Endpoint Inventory

### List Endpoint

- Route path: `GET /api/history`
- Handler file: `deploy-worker/src/index.js`
- Handler block: inline route in `handleRequest`
- Current source table: `sessions`
- Current response shape: array of session rows
- Current response fields include: `id`, `corpid`, `anchor_id`, `date`, `entries_count`, `created_by`, `operator_id`, `operator_name`, `handover_status`, `exported_at`, `export_text`, `source`, `cash_handover`, `bank_transfer_total`, `gross_received`, `voided_at`, `voided_by`, `void_reason`, `void_source`
- Current total fields: `cash_handover`, `bank_transfer_total`, `gross_received`
- Current parser/helper used: direct SQL row return; frontend normalizes via `normalizeLedgerSessions`
- Owner UI use: `deploy-worker/public/index-51-main.js` calls `/api/history?limit=...`; expects an array and maps session row fields directly.
- H4B recommendation: modify only if correction lookup is cheap. Add nested `correction_summary` only; do not change existing top-level fields. If list lookup would scan full history, leave list endpoint untouched for H4B and start with detail endpoint.

### Detail Endpoint

- Route path: `GET /api/session_detail?id=...`
- Handler file: `deploy-worker/src/index.js`
- Handler block: inline route in `handleRequest`
- Current source tables: `sessions`, `transactions`
- Current response shape: array of detail rows
- Current response fields include parsed transaction/anchor row fields such as `id`, `event_id`, `event_type`, `type`, `reason_code`, `cat`, `room`, `bed`, `from_bed`, `to_bed`, `amount`, `paid_amount`, `payment_amount`, `expected_rent`, `expected_amount`, `payment_method`, `pay_type`, `note`, `raw_display_line`, `arrears_ref`, `linked_task_id`
- Current total fields: detail totals are calculated in helper functions, not currently returned as a separate detail summary object.
- Current parser/helper used: `extractEmployeeEntryAnchorsFromSession`, `parseEmployeeEntryExportRows`, `chooseOwnerEmployeeSessionDetailRows`, `ownerEmployeeDetailRowsTotals`, `ownerEmployeeDetailRowsReconcileSession`
- Owner UI use: `deploy-worker/public/index-51-main.js` calls `/api/session_detail?id=...` and expects an array. The frontend maps each row into the existing ledger session entry shape.
- H4B recommendation: safest first implementation target, but only if compatibility is preserved. Because current consumers expect an array, either add optional query mode such as `?include_corrections=1&shape=object`, or attach non-enumerable-compatible metadata through an agreed wrapper only after owner UI compatibility tests. Do not break the existing array response.

### Phase0 Owner History Endpoint

- Route path: `GET /api/owner/history`
- Handler file: `deploy-worker/src/index.js`
- Handler function: `phase0Entries(env, user, url)`
- Current source tables: prefers `entries`, falls back to `transactions`
- Current response shape: object `{ entries: [...] }`
- Current total fields: none calculated here; raw transaction rows are returned.
- Current parser/helper used: `phase0Entries`, `phase0All`, `phase0TableExists`
- H4B recommendation: leave untouched in first H4B unless confirmed actively used by owner History UI. It is a legacy/phase0 endpoint and not the primary current history page path.

### Daily Summary Endpoint

- Route path: no standalone daily history endpoint identified.
- Current related endpoint: `GET /api/owner/overview/comparative-summary`
- Handler file: `deploy-worker/src/index.js`
- Handler function: `phase0OwnerOverviewComparativeSummary`
- Current source helpers: `ownerOverviewFetchTransactions`, `ownerOverviewFetchEntryEventTransactions`, `ownerOverviewSummarizeTransactions`, `ownerOverviewFetchSessionPeriodSummary`
- Current response fields include: `current`, `current_period_received`, `last_month`, `same_month_last_year`, `quarter_to_date`, `comparisons`, `accounting_separation`, `arrears`, `current_receivables_sot`, `risk_watch`, `data_quality`
- Current total fields: `gross_received`, `rent_received`, `deposit_received`, `arrears_recovered`, `bed_transfer_fee`, `deposit_refund`, `expenses`, `net_cashflow`, and `current_period_received.gross_received`
- H4B recommendation: leave summary totals unchanged. Future correction-aware summaries should be added as nested optional fields after detail endpoint is stable.

### Employee/Operator Summary Endpoint

- Route path: no standalone employee/operator owner history summary endpoint identified.
- Current related sources: owner History frontend groups `/api/history` rows by date/month locally; overview endpoint provides aggregate windows but not employee/operator correction summaries.
- H4B recommendation: future implementation may expose `employee_summary` only in a correction-aware optional response mode. Do not alter existing raw totals.

### Export Endpoint

- Route path: no standalone owner History export API endpoint identified.
- Current export behavior: owner UI detail view copies/downloads text derived from `ownerHistoryDetailMainText(s)` after loading `/api/session_detail`.
- H4B recommendation: leave untouched. Correction audit/export can be planned after runtime response fields and UI display modes are designed.

## 3. Current Response Contract

Existing response fields are raw/source fields and must be treated as raw totals.

### Session List Raw Fields

- `id` / session id
- `anchor_id` / session anchor
- `date`
- `entries_count`
- `created_by`
- `operator_id`
- `operator_name`
- `source`
- `handover_status`
- `voided_at`
- `export_text`
- `cash_handover`
- `bank_transfer_total`
- `gross_received`

### Detail Raw Fields

- Parsed transactions or employee entry anchors are returned as an array.
- Detail row fields include `id`, `event_id`, `event_type`, `type`, `reason_code`, `cat`, `room`, `bed`, `room_to`, `from_bed`, `to_bed`, `amount`, `paid_amount`, `payment_amount`, `expected_rent`, `expected_amount`, `payment_method`, `pay_type`, `note`, `raw_display_line`, `arrears_ref`, and `linked_task_id`.
- Owner detail rows are selected from structured anchors first when reconciliation passes, then transactions, then export text fallback.
- Detail totals are currently derived by `ownerEmployeeDetailRowsTotals(rows)` and reconciled by `ownerEmployeeDetailRowsReconcileSession(session, rows)`.

### Summary Raw Fields

- Current period received uses owner-visible sessions summary via `ownerOverviewFetchSessionPeriodSummary`.
- Daily/month/quarter overview totals use `ownerOverviewSummarizeTransactions` over transaction-like rows.
- Current receivables and arrears overview use separate SOT helpers and must not be mixed with correction-aware owner History totals.

All fields above are raw/source totals. H4B must keep them unchanged by default.

## 4. H4B Additive Fields Contract

Add nested fields only. Do not change current top-level fields.

For any correction-aware response, add:

```json
{
  "correction_summary": {
    "correction_aware": true,
    "correction_applied": false,
    "raw_totals": {},
    "correction_totals": {},
    "adjusted_totals": {},
    "correction_events_count": 0,
    "invalid_corrections_count": 0,
    "warnings": []
  }
}
```

Optional detail object:

```json
{
  "correction_audit": {
    "raw_mode_available": true,
    "adjusted_mode_available": true,
    "audit_mode_available": true,
    "original_events_visible": true,
    "correction_events_visible": true,
    "correction_sessions": [],
    "correction_events": [],
    "invalid_corrections": []
  }
}
```

The top-level `cash_handover`, `bank_transfer_total`, `gross_received`, detail row array, and overview raw totals remain unchanged in H4B.

## 5. Default Behavior

H4B must not silently replace current owner-visible totals.

Default current fields remain raw totals. New fields are additive only. Owner UI should continue working even if it ignores `correction_summary` and `correction_audit`.

If a response currently returns an array, H4B must not replace that array with an object unless the change is gated by an explicit optional query parameter and accompanied by owner UI compatibility tests.

## 6. Correction Session Discovery Strategy

Correction sessions will be stored through the existing `sessions` / `export_text` mechanism.

Runtime discovery strategy:

1. Scan relevant sessions for `HOMELINK OWNER CORRECTION`.
2. Parse `==== CORRECTION ANCHORS JSON ====`.
3. Require `anchor_contract_version = owner_correction_anchor_v1`.
4. Link by `target_session_anchor` and `target_session_id`.
5. Apply only `status = applied`.
6. Ignore `pending`, `rejected`, `reversed`, and `voided`.
7. Link correction events by `original_event_id`.
8. Reject correction linking that depends on `card_id`, `tenant_card_id`, provider phone, `99099`, or `old_ttlock_ref`.
9. Do not double-apply corrections to the same `original_event_id`.
10. Fail closed on invalid correction parsing.

Because production apply is disabled currently, production may have zero correction sessions. H4B must return `correction_applied = false`, empty correction events, and no financial adjustment when no correction exists.

## 7. Performance And Scope

Do not scan entire production history if it is expensive.

Recommended staged strategy:

A. Detail endpoint first:

- When opening one target session, load correction sessions targeting that session only if efficient.
- Prefer a bounded query using `export_text LIKE '%CORRECTION ANCHORS JSON%'` plus target anchor/id search.
- Return additive correction fields only for the requested session.

B. List endpoint second:

- Add correction-aware fields to list only if correction lookup can be done cheaply for the current page of sessions.
- Avoid full-history scans.
- If correction lookup is not cheap, leave list endpoint unchanged in H4B.

C. Summary endpoints later:

- Add raw/correction/adjusted daily or employee summaries only after detail endpoint compatibility is proven.

Recommended minimal safe first implementation:

Start with `/api/session_detail` optional correction-aware response mode, gated behind an explicit query parameter such as `include_corrections=1`. Preserve the default array response. Do not alter `/api/history` list or overview summary totals in the first runtime implementation.

## 8. x6wio Expected Future Behavior

If a future correction anchor exists for:

- `EMPV3-20260707-abdul-x6wio`
- `S20260707-x6wio`

Then detail response should keep existing raw fields unchanged:

- `gross = 1550`
- `cash = 1550`

New `correction_summary` should show:

- `raw_totals.gross = 1550`
- `correction_totals.gross_delta = -1470`
- `adjusted_totals.gross = 80`
- `raw_totals.cash = 1550`
- `correction_totals.cash_delta = -1470`
- `adjusted_totals.cash = 80`
- `adjusted_totals.rent_income = 0`
- `adjusted_totals.arrears_repaid = 80`

Original events visible: true.

Correction events visible: true.

The original x6wio source rows must remain visible in raw/audit mode:

- `#334 arrears_payment 80`
- `#334 rent 700 duplicate`
- `#134 rent 770 duplicate`

Correction events must be visible separately:

- `void_duplicate_event ent20260707-x6wio-02`
- `void_duplicate_event ent20260707-x6wip-03`

## 9. Safety Rules

H4B implementation must:

- not mutate original sessions
- not hide original source events
- not change old top-level total fields
- not enable production apply
- not write production data
- not add migration
- not depend on `card_id`, `tenant_card_id`, provider phone, `99099`, or `old_ttlock_ref` identity
- not double-apply corrections
- fail closed if correction parsing is invalid
- keep raw/source totals visible
- label adjusted totals clearly as adjusted
- preserve owner UI compatibility

## 10. No-Go Conditions

Implementation must stop if:

- exact owner History endpoint cannot be identified
- current UI depends on top-level totals that would be changed
- adding fields would break existing response consumers
- correction lookup requires expensive full-history scan
- correction parser cannot link to `original_event_id`
- correction-aware fields require migration
- implementation would enable production apply
- implementation would change owner UI
- implementation would silently replace raw totals
- implementation would require correction writes to production
- implementation would depend on `card_id`, `tenant_card_id`, provider phone, `99099`, or `old_ttlock_ref`

## 11. Required Future H4B Implementation Tests

Future H4B implementation must include tests for:

- old owner history response unchanged at top level
- new `correction_summary` exists where enabled
- no correction sessions returns `correction_applied = false`
- fixture correction session returns adjusted total 80
- raw totals remain 1550
- correction totals are -1470
- adjusted totals are 80
- original events visible
- correction events visible
- invalid correction gives warning and is not applied
- pending correction ignored
- rejected correction ignored
- reversed correction ignored
- voided correction ignored
- duplicate correction not double-applied
- no production write
- no migration
- no production apply enablement
- owner UI compatibility regression
- owner History parser regression
- duplicate guard regression
- rent upload regression
- arrears payment regression
- bed transfer regression

## H4B.0 Scope Locks

- Runtime behavior changed: no.
- Production data changed: no.
- Deploy: no.
- Migration: no.
- Owner UI changed: no.
- Employee UI changed: no.
- Production apply enabled: no.
- x6wio production data corrected: no.
- Durable correction events table implemented: no.
- WhatsApp compiler implemented: no.

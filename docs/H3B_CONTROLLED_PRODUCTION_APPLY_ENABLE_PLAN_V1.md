# H3B Controlled Production Apply Enable Plan V1

Date: 2026-07-08

Status: planning only. No production apply enabled. No correction applied to x6wio. No correction anchor written. No production data changed. No migration. No deploy.

## 1. Purpose

Production correction apply must not be globally enabled without a narrow runbook because correction writes are financially material and audit-sensitive. A broad write gate could allow an owner correction to change adjusted totals for the wrong session, wrong event IDs, or wrong correction type.

This plan defines how to safely prepare for one future owner-approved correction for `EMPV3-20260707-abdul-x6wio` / `S20260707-x6wio` without opening broad production correction writes.

## 2. Current Verified Safety Prerequisites

Verified prerequisites already completed:

- H2 Owner Correction dry-run preview is `LIVE_VERIFIED`.
- H3A apply endpoint disabled gate is `LIVE_VERIFIED`.
- H4B correction-aware detail endpoint is `LIVE_VERIFIED`.
- Production apply is currently disabled.
- `x6wio` is not yet corrected.
- Production apply remains disabled in this H3B.0 planning step.
- Production data is not written in this H3B.0 planning step.

Current raw production state for target:

- target_session_id = `S20260707-x6wio`
- target_session_anchor = `EMPV3-20260707-abdul-x6wio`
- raw gross = `1550`
- raw cash = `1550`
- raw rent_income = `1470`
- raw arrears_repaid = `80`

Expected future adjusted state if the 80 AED arrears payment is real:

- keep `ent20260707-x6wio-01` / `#334 arrears_payment 80`
- void by correction anchor `ent20260707-x6wio-02` / `#334 rent 700 duplicate`
- void by correction anchor `ent20260707-x6wip-03` / `#134 rent 770 duplicate`
- adjusted gross = `80`
- adjusted cash = `80`
- adjusted rent_income = `0`
- adjusted arrears_repaid = `80`

## 3. Recommended Enable Strategy

Use a target-scoped allow mechanism rather than a broad global write flag.

Safest future H3B enable strategy:

- `target_session_id` must equal `S20260707-x6wio`.
- `target_session_anchor` must equal `EMPV3-20260707-abdul-x6wio`.
- `correction_type` must equal `duplicate_upload_correction`.
- allowed `original_event_id` list must exactly equal:
  - `ent20260707-x6wio-02`
  - `ent20260707-x6wip-03`
- expected `correction_gross_delta` must equal `-1470`.
- expected `adjusted_gross` must equal `80`.
- expected `correction_cash_delta` must equal `-1470`.
- expected `adjusted_cash` must equal `80`.
- `idempotency_key` is required.
- `preview_hash` is required.
- explicit owner confirmation is required.

The future allow mechanism should be one-time, target-scoped, and disabled by default. It should only permit the exact correction described above and should reject every other target, session, event list, amount, correction type, or preview hash.

## 4. Do Not Use Broad Global Write Gate Alone

Do not rely on `OWNER_CORRECTION_APPLY_ENABLED=true` by itself.

Risk:

- A broad global apply flag may allow unintended correction writes.
- A broad global apply flag may allow a correct endpoint to apply the wrong target.
- A broad global apply flag may allow a stale preview to be applied after source data changed.
- A broad global apply flag may allow future correction types before their audit rules are ready.

If the existing implementation only supports a broad environment flag, add a second narrow allowlist gate before any production apply. The narrow allowlist gate must check exact target, event IDs, correction type, preview hash, idempotency key, expected deltas, expected adjusted totals, and explicit owner confirmation.

## 5. Required Owner Confirmation

Future apply payload must include explicit owner confirmation:

```json
{
  "confirmed": true,
  "understands_original_events_immutable": true,
  "understands_no_hard_delete": true,
  "understands_correction_is_additive": true,
  "confirmed_target_session_anchor": "EMPV3-20260707-abdul-x6wio",
  "confirmed_target_session_id": "S20260707-x6wio",
  "confirmed_correction_gross_delta": -1470,
  "confirmed_adjusted_gross": 80,
  "confirmed_correction_cash_delta": -1470,
  "confirmed_adjusted_cash": 80
}
```

Reject if any confirmation field is missing, false, stale, mismatched, or refers to a different target.

## 6. Required Pre-Apply Checks

Before any future real apply, the system must re-run preview and verify:

- original gross still `1550`.
- original cash still `1550`.
- correction gross_delta still `-1470`.
- correction cash_delta still `-1470`.
- adjusted gross still `80`.
- adjusted cash still `80`.
- original events still exist.
- correction events list exactly `2`.
- allowed original_event_id list exactly equals `ent20260707-x6wio-02` and `ent20260707-x6wip-03`.
- no existing active correction already voided these event IDs.
- `preview_hash` matches the recomputed preview.
- `idempotency_key` is present and unused, or is an exact idempotent replay.
- explicit owner confirmation is present and exact.
- production apply is disabled unless narrow one-time authorization is present.

## 7. Required Post-Apply Verification

After a future controlled apply, immediately verify:

- correction anchor session exists.
- original x6wio data remains unchanged.
- no hard delete occurred.
- no transaction row mutation occurred.
- no `arrear_tasks` mutation occurred.
- no deposit mutation occurred.
- H4B opt-in detail endpoint returns:
  - `correction_applied = true`
  - `correction_totals.gross_delta = -1470`
  - `adjusted_totals.gross = 80`
  - `correction_totals.cash_delta = -1470`
  - `adjusted_totals.cash = 80`
- legacy endpoint remains compatible.
- production apply gate is disabled again.
- production write scope is only the new additive correction anchor session.

## 8. Rollback / Reversal Plan

If the future correction is wrong:

- Do not delete the correction anchor.
- Do not mutate the original employee session.
- Do not mutate transaction rows.
- Do not mutate `arrear_tasks`.
- Do not mutate deposit ledger rows.
- Create a reversal correction anchor.
- Keep the original correction auditable.
- Owner History audit mode must show the original correction and the reversal.
- Adjusted totals must be derived by applying the original correction plus reversal correction, not by deleting history.

## 9. No-Go Conditions

Stop and do not apply if any condition is true:

- cannot implement target-scoped apply authorization.
- broad global apply is the only protection.
- `preview_hash` cannot be verified.
- original session changed.
- event IDs changed.
- existing correction already applies.
- H4B detail endpoint cannot show adjusted result.
- applying requires migration.
- applying requires mutating original session.
- applying requires modifying `arrear_tasks`.
- applying requires modifying deposit ledger rows.
- applying requires modifying transactions.
- owner confirmation is missing.
- correction type is not `duplicate_upload_correction`.
- target session id is not `S20260707-x6wio`.
- target session anchor is not `EMPV3-20260707-abdul-x6wio`.

## 10. Future Implementation Phases

H3B.1: implement target-scoped production apply authorization gate, disabled by default.

H3B.2: live verify gate rejects non-x6wio targets.

H3B.3: prepare final x6wio apply payload and `preview_hash`.

H3B.4: owner explicit confirmation.

H3B.5: single controlled apply.

H3B.6: immediate post-apply verification.

H3B.7: disable gate again.

## 11. Planning Step Boundaries

This H3B.0 step forbids:

- production write.
- enabling production apply.
- applying correction to x6wio.
- writing correction anchor.
- migration.
- owner UI changes.
- employee UI changes.
- employee upload changes.
- owner History visible total changes.
- transaction mutation.
- `arrear_tasks` mutation.
- deposit ledger mutation.
- replacing `tenant_card_id` legacy matching.
- implementing WhatsApp compiler.

Recommended next step:

`GO_TO_H3B1_TARGET_SCOPED_APPLY_AUTHORIZATION_GATE`

If target-scoped authorization cannot be implemented, use:

`DO_NOT_IMPLEMENT_YET`

production_cutover = `PRODUCTION_NO_GO`

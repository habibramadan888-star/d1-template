# H3B2 Final x6wio Apply Preflight Package V1

Date: 2026-07-08

Status: preflight package only. No production apply enabled. No correction applied to x6wio. No correction anchor written. No production data changed. No migration. No deploy required by this document.

## 1. Purpose

This package prepares the final no-write preflight for the future x6wio owner correction. It does not apply the correction.

The package lets an authenticated owner browser session:

- re-run the H2 dry-run preview for the exact x6wio correction.
- confirm H4B detail still shows the target uncorrected before apply.
- capture the server `preview_hash`.
- build the final apply payload for future owner approval.
- confirm production apply remains disabled with a dummy disabled-gate probe.
- avoid submitting the final apply payload.

## 2. Current Verified State

Previously completed live verification:

- H2 dry-run preview: `LIVE_VERIFIED`.
- H3B1 target-scoped apply authorization gate: `LIVE_VERIFIED`.
- H4B correction-aware detail endpoint: `LIVE_VERIFIED`.

Verified target:

- target_session_id = `S20260707-x6wio`
- target_session_anchor = `EMPV3-20260707-abdul-x6wio`

Current production state before any correction:

- raw gross = `1550`
- raw cash = `1550`
- raw rent_income = `1470`
- raw arrears_repaid = `80`
- production apply = `disabled`
- x6wio corrected = `no`
- correction anchor written = `no`

## 3. Required Owner Business Confirmation

Do not proceed to real apply until the owner explicitly confirms:

`The 80 AED arrears_payment in x6wio was real cash received.`

If 80 AED was real:

- keep `ent20260707-x6wio-01` / `#334 arrears_payment 80`
- void duplicate rent `ent20260707-x6wio-02` / `#334 rent 700`
- void duplicate rent `ent20260707-x6wip-03` / `#134 rent 770`

If 80 AED was not real:

- this apply package is invalid.
- a different correction plan is required.

## 4. Exact Correction Events

Final correction events must be exactly these two events.

Event 1:

```json
{
  "correction_event_type": "void_duplicate_event",
  "original_event_id": "ent20260707-x6wio-02",
  "original_session_id": "S20260707-x6wio",
  "original_anchor": "EMPV3-20260707-abdul-x6wio",
  "affected_bed": "334",
  "affected_event_type": "rent",
  "correction_reason": "Duplicate #334 rent 700 already exists in the legitimate original upload.",
  "financial_effect": {
    "cash_delta": -700,
    "bank_delta": 0,
    "gross_delta": -700,
    "rent_income_delta": -700,
    "deposit_liability_delta": 0,
    "arrears_repaid_delta": 0,
    "arrears_open_delta": 0,
    "expense_delta": 0,
    "transfer_fee_delta": 0
  },
  "status": "applied"
}
```

Event 2:

```json
{
  "correction_event_type": "void_duplicate_event",
  "original_event_id": "ent20260707-x6wip-03",
  "original_session_id": "S20260707-x6wio",
  "original_anchor": "EMPV3-20260707-abdul-x6wio",
  "affected_bed": "134",
  "affected_event_type": "rent",
  "correction_reason": "Duplicate #134 rent 770 already exists in the legitimate original upload.",
  "financial_effect": {
    "cash_delta": -770,
    "bank_delta": 0,
    "gross_delta": -770,
    "rent_income_delta": -770,
    "deposit_liability_delta": 0,
    "arrears_repaid_delta": 0,
    "arrears_open_delta": 0,
    "expense_delta": 0,
    "transfer_fee_delta": 0
  },
  "status": "applied"
}
```

Combined correction totals:

- correction gross_delta = `-1470`
- correction cash_delta = `-1470`
- correction rent_income_delta = `-1470`
- adjusted gross = `80`
- adjusted cash = `80`
- adjusted rent_income = `0`
- adjusted arrears_repaid = `80`

## 5. H2 Preview Request

Use this request only against:

`POST /api/owner/corrections/preview`

```json
{
  "target_session_anchor": "EMPV3-20260707-abdul-x6wio",
  "target_session_id": "S20260707-x6wio",
  "correction_type": "duplicate_upload_correction",
  "correction_reason": "Void duplicate rent rows in x6wio while keeping the real 80 AED arrears payment.",
  "evidence_summary": "Original w1ofc already contains #334 rent 700 and #134 rent 770. x6wio should keep only #334 arrears_payment 80.",
  "correction_events": [
    {
      "correction_event_type": "void_duplicate_event",
      "original_event_id": "ent20260707-x6wio-02",
      "original_session_id": "S20260707-x6wio",
      "original_anchor": "EMPV3-20260707-abdul-x6wio",
      "affected_bed": "334",
      "affected_event_type": "rent",
      "correction_reason": "Duplicate #334 rent 700 already exists in the legitimate original upload.",
      "financial_effect": {
        "cash_delta": -700,
        "bank_delta": 0,
        "gross_delta": -700,
        "rent_income_delta": -700,
        "deposit_liability_delta": 0,
        "arrears_repaid_delta": 0,
        "arrears_open_delta": 0,
        "expense_delta": 0,
        "transfer_fee_delta": 0
      },
      "status": "applied"
    },
    {
      "correction_event_type": "void_duplicate_event",
      "original_event_id": "ent20260707-x6wip-03",
      "original_session_id": "S20260707-x6wio",
      "original_anchor": "EMPV3-20260707-abdul-x6wio",
      "affected_bed": "134",
      "affected_event_type": "rent",
      "correction_reason": "Duplicate #134 rent 770 already exists in the legitimate original upload.",
      "financial_effect": {
        "cash_delta": -770,
        "bank_delta": 0,
        "gross_delta": -770,
        "rent_income_delta": -770,
        "deposit_liability_delta": 0,
        "arrears_repaid_delta": 0,
        "arrears_open_delta": 0,
        "expense_delta": 0,
        "transfer_fee_delta": 0
      },
      "status": "applied"
    }
  ]
}
```

## 6. Expected Preview Response

Expected H2 preview values:

- original gross = `1550`
- correction gross_delta = `-1470`
- adjusted gross = `80`
- original cash = `1550`
- correction cash_delta = `-1470`
- adjusted cash = `80`
- adjusted rent_income = `0`
- adjusted arrears_repaid = `80`
- invalid corrections = none
- `preview_hash` exists and is non-empty
- no_write = true
- production_cutover = `PRODUCTION_NO_GO`

## 7. preview_hash Requirement

The final apply payload must use the exact `preview_hash` returned by the server preview response.

Do not hand-type or invent `preview_hash`.

Stop if:

- `preview_hash` is missing.
- `preview_hash` is empty.
- preview totals do not match the expected values.
- H4B detail already says `correction_applied = true`.

## 8. Final Apply Payload Shape

The final payload is generated by the manual script but must not be submitted in H3B2.

```json
{
  "target_session_anchor": "EMPV3-20260707-abdul-x6wio",
  "target_session_id": "S20260707-x6wio",
  "correction_type": "duplicate_upload_correction",
  "correction_reason": "Void duplicate rent rows in x6wio while keeping the real 80 AED arrears payment.",
  "evidence_summary": "Original w1ofc already contains #334 rent 700 and #134 rent 770. x6wio should keep only #334 arrears_payment 80.",
  "correction_events": ["<exact two events from Section 4>"],
  "preview_hash": "<from server preview>",
  "idempotency_key": "<stable key>",
  "explicit_owner_confirmation": {
    "confirmed": true,
    "understands_original_events_immutable": true,
    "understands_no_hard_delete": true,
    "understands_correction_is_additive": true,
    "confirmed_target_session_anchor": "EMPV3-20260707-abdul-x6wio",
    "confirmed_target_session_id": "S20260707-x6wio",
    "confirmed_correction_gross_delta": -1470,
    "confirmed_adjusted_gross": 80,
    "confirmed_correction_cash_delta": -1470,
    "confirmed_adjusted_cash": 80,
    "confirmed_80_aed_arrears_payment_was_real": true
  }
}
```

## 9. Explicit Owner Confirmation Payload

The final apply payload must include this exact owner confirmation block:

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
  "confirmed_adjusted_cash": 80,
  "confirmed_80_aed_arrears_payment_was_real": true
}
```

## 10. idempotency_key Format

Use a stable key derived from the target and server preview hash:

`H3B2-x6wio-duplicate-rent-1470-${preview_hash_prefix}`

Where `preview_hash_prefix` is the first 16 characters of the server `preview_hash`.

Do not use a timestamp for the final apply payload idempotency key.

## 11. Pre-Apply Checklist

Before any future real apply, verify all items:

- owner explicitly confirmed the 80 AED arrears_payment was real cash received.
- H4B detail before apply returns `correction_applied = false`.
- H4B detail before apply returns adjusted gross `1550`.
- H2 preview returns original gross `1550`.
- H2 preview returns correction gross_delta `-1470`.
- H2 preview returns adjusted gross `80`.
- H2 preview returns original cash `1550`.
- H2 preview returns correction cash_delta `-1470`.
- H2 preview returns adjusted cash `80`.
- H2 preview returns adjusted rent_income `0`.
- H2 preview returns adjusted arrears_repaid `80`.
- `preview_hash` exists and is copied from the latest server preview.
- `idempotency_key` is stable and derived from the preview hash.
- correction events list exactly contains `ent20260707-x6wio-02` and `ent20260707-x6wip-03`.
- production apply remains disabled unless a separate future controlled apply step explicitly enables the target-scoped gate.

## 12. Post-Apply Checklist For Future Step

After a future controlled apply, immediately verify:

- production write scope is exactly one additive correction anchor session.
- original x6wio session remains unchanged.
- no hard delete occurred.
- no transaction row was mutated.
- no `arrear_tasks` row was mutated.
- no deposit ledger row was mutated.
- H4B opt-in detail returns `correction_applied = true`.
- H4B opt-in detail returns correction gross_delta `-1470`.
- H4B opt-in detail returns adjusted gross `80`.
- H4B opt-in detail returns correction cash_delta `-1470`.
- H4B opt-in detail returns adjusted cash `80`.
- legacy `/api/session_detail?id=S20260707-x6wio` remains compatible.
- production apply gate is disabled again.

## 13. No-Go Conditions

Stop and do not apply if any condition is true:

- owner has not confirmed that the 80 AED arrears_payment was real.
- preview_hash is missing.
- preview_hash is stale.
- H2 preview totals differ from expected values.
- H4B detail already shows `correction_applied = true`.
- original event IDs changed.
- original session no longer has the expected raw totals.
- correction requires mutating original x6wio data.
- correction requires mutating transactions.
- correction requires mutating `arrear_tasks`.
- correction requires mutating deposit ledger.
- correction requires migration.
- production apply cannot be target-scoped.
- broad global apply is the only available protection.

## 14. Rollback / Reversal Reminder

If a future applied correction is wrong:

- do not delete the correction anchor.
- do not mutate the original employee session.
- do not mutate transaction rows.
- do not mutate `arrear_tasks`.
- do not mutate deposit ledger rows.
- create a reversal correction anchor.
- keep the original correction and reversal auditable.
- adjusted totals must be derived from original plus correction plus reversal.

## 15. Manual Live Verification Script

Run this from the authenticated owner browser console.

This script does not submit the final apply payload. It writes the final payload into a textarea for manual review only.

```js
(async () => {
  const target_session_id = "S20260707-x6wio";
  const target_session_anchor = "EMPV3-20260707-abdul-x6wio";

  const correction_events = [
    {
      correction_event_type: "void_duplicate_event",
      original_event_id: "ent20260707-x6wio-02",
      original_session_id: "S20260707-x6wio",
      original_anchor: "EMPV3-20260707-abdul-x6wio",
      affected_bed: "334",
      affected_event_type: "rent",
      correction_reason: "Duplicate #334 rent 700 already exists in the legitimate original upload.",
      financial_effect: {
        cash_delta: -700,
        bank_delta: 0,
        gross_delta: -700,
        rent_income_delta: -700,
        deposit_liability_delta: 0,
        arrears_repaid_delta: 0,
        arrears_open_delta: 0,
        expense_delta: 0,
        transfer_fee_delta: 0
      },
      status: "applied"
    },
    {
      correction_event_type: "void_duplicate_event",
      original_event_id: "ent20260707-x6wip-03",
      original_session_id: "S20260707-x6wio",
      original_anchor: "EMPV3-20260707-abdul-x6wio",
      affected_bed: "134",
      affected_event_type: "rent",
      correction_reason: "Duplicate #134 rent 770 already exists in the legitimate original upload.",
      financial_effect: {
        cash_delta: -770,
        bank_delta: 0,
        gross_delta: -770,
        rent_income_delta: -770,
        deposit_liability_delta: 0,
        arrears_repaid_delta: 0,
        arrears_open_delta: 0,
        expense_delta: 0,
        transfer_fee_delta: 0
      },
      status: "applied"
    }
  ];

  const readJson = async (url, options = {}) => {
    const res = await fetch(url, { credentials: "include", ...options });
    const raw = await res.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch (error) {
      console.log({ url, status: res.status, raw });
      throw error;
    }
    return { url, status: res.status, json, raw };
  };

  const detail = await readJson(`/api/session_detail?id=${encodeURIComponent(target_session_id)}&include_corrections=1`);
  const summary = detail.json.correction_summary || {};
  const beforeApplyOk =
    detail.status === 200 &&
    detail.json.code === 0 &&
    Array.isArray(detail.json.data) &&
    summary.correction_applied === false &&
    summary.adjusted_totals?.gross === 1550;

  const previewRequest = {
    target_session_anchor,
    target_session_id,
    correction_type: "duplicate_upload_correction",
    correction_reason: "Void duplicate rent rows in x6wio while keeping the real 80 AED arrears payment.",
    evidence_summary: "Original w1ofc already contains #334 rent 700 and #134 rent 770. x6wio should keep only #334 arrears_payment 80.",
    correction_events
  };

  const preview = await readJson("/api/owner/corrections/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(previewRequest)
  });

  const preview_hash = preview.json.preview_hash || "";
  const previewOk =
    preview.status === 200 &&
    preview.json.original_totals?.gross === 1550 &&
    preview.json.correction_totals?.gross_delta === -1470 &&
    preview.json.adjusted_totals?.gross === 80 &&
    preview.json.original_totals?.cash === 1550 &&
    preview.json.correction_totals?.cash_delta === -1470 &&
    preview.json.adjusted_totals?.cash === 80 &&
    preview.json.adjusted_totals?.rent_income === 0 &&
    preview.json.adjusted_totals?.arrears_repaid === 80 &&
    typeof preview_hash === "string" &&
    preview_hash.length > 0;

  const finalApplyPayload = {
    ...previewRequest,
    preview_hash,
    idempotency_key: `H3B2-x6wio-duplicate-rent-1470-${preview_hash.slice(0, 16)}`,
    explicit_owner_confirmation: {
      confirmed: true,
      understands_original_events_immutable: true,
      understands_no_hard_delete: true,
      understands_correction_is_additive: true,
      confirmed_target_session_anchor: "EMPV3-20260707-abdul-x6wio",
      confirmed_target_session_id: "S20260707-x6wio",
      confirmed_correction_gross_delta: -1470,
      confirmed_adjusted_gross: 80,
      confirmed_correction_cash_delta: -1470,
      confirmed_adjusted_cash: 80,
      confirmed_80_aed_arrears_payment_was_real: true
    }
  };

  const disabledGatePayload = {
    target_session_anchor: "DUMMY-H3B2-DISABLED-GATE-CHECK",
    target_session_id: "DUMMY-H3B2-DISABLED-GATE-CHECK",
    correction_type: "disabled_gate_probe",
    correction_reason: "Dummy no-write disabled gate probe. Not the x6wio final apply payload.",
    evidence_summary: "No-write live verification only.",
    correction_events: [],
    preview_hash: "dummy-not-final-preview-hash",
    idempotency_key: `dummy-h3b2-no-write-${Date.now()}`,
    explicit_owner_confirmation: { confirmed: false }
  };

  const disabledGate = await readJson("/api/owner/corrections/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(disabledGatePayload)
  });

  const box = document.createElement("textarea");
  box.value = JSON.stringify(finalApplyPayload, null, 2);
  box.style.width = "100%";
  box.style.height = "420px";
  box.style.position = "fixed";
  box.style.left = "0";
  box.style.bottom = "0";
  box.style.zIndex = "999999";
  box.setAttribute("aria-label", "H3B2 final apply payload preview only. Do not submit in this step.");
  document.body.appendChild(box);
  box.focus();
  box.select();

  const disabledCode = disabledGate.json.error_code || disabledGate.json.code || "";
  const result = {
    status_label:
      beforeApplyOk &&
      previewOk &&
      disabledCode === "OWNER_CORRECTION_APPLY_DISABLED" &&
      disabledGate.json.no_write === true
        ? "LIVE_VERIFIED"
        : "NOT_LIVE_VERIFIED",
    before_apply_detail_status: detail.status,
    before_apply_correction_applied: summary.correction_applied === false,
    before_apply_adjusted_gross: summary.adjusted_totals?.gross,
    preview_status: preview.status,
    original_gross: preview.json.original_totals?.gross,
    correction_gross_delta: preview.json.correction_totals?.gross_delta,
    adjusted_gross: preview.json.adjusted_totals?.gross,
    original_cash: preview.json.original_totals?.cash,
    correction_cash_delta: preview.json.correction_totals?.cash_delta,
    adjusted_cash: preview.json.adjusted_totals?.cash,
    adjusted_rent_income: preview.json.adjusted_totals?.rent_income,
    adjusted_arrears_repaid: preview.json.adjusted_totals?.arrears_repaid,
    preview_hash_exists: preview_hash.length > 0,
    final_apply_payload_built: true,
    final_apply_payload_submitted: false,
    disabled_gate_status: disabledGate.status,
    disabled_gate_error_code: disabledCode,
    disabled_gate_no_write: disabledGate.json.no_write === true,
    production_write: "no",
    migration: "no",
    production_cutover: "PRODUCTION_NO_GO"
  };

  console.log("H3B2 final x6wio apply preflight package result", result);
  console.log("Raw H4B detail response", detail.json);
  console.log("Raw H2 preview response", preview.json);
  console.log("Raw disabled gate dummy response", disabledGate.json);
  console.log("Final apply payload preview only. Do not submit in H3B2.", finalApplyPayload);
})();
```

Expected:

- H4B detail before apply returns HTTP 200.
- H4B detail before apply returns `correction_applied = false`.
- H4B detail before apply returns adjusted gross `1550`.
- H2 preview returns original gross `1550`.
- H2 preview returns correction gross_delta `-1470`.
- H2 preview returns adjusted gross `80`.
- H2 preview returns original cash `1550`.
- H2 preview returns correction cash_delta `-1470`.
- H2 preview returns adjusted cash `80`.
- H2 preview returns adjusted rent_income `0`.
- H2 preview returns adjusted arrears_repaid `80`.
- H2 preview returns non-empty `preview_hash`.
- final apply payload is built into a textarea.
- final apply payload is not submitted.
- dummy disabled gate probe returns `OWNER_CORRECTION_APPLY_DISABLED` and `no_write = true`.
- production_write = `no`.
- production_cutover = `PRODUCTION_NO_GO`.

Recommended next step:

`LIVE_RUN_H3B2_PREFLIGHT_TO_CAPTURE_PREVIEW_HASH_AND_FINAL_PAYLOAD`

production_cutover = `PRODUCTION_NO_GO`

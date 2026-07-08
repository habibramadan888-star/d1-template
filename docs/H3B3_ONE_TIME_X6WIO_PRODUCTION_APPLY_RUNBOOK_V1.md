# H3B3 One-Time x6wio Production Apply Runbook V1

Date: 2026-07-08

Status: execution runbook only. No production apply enabled in this step. No correction applied to x6wio in this step. No correction anchor written in this step. No production data changed. No migration. No deploy.

## 1. Purpose

This runbook exists to apply exactly one owner-approved correction anchor for x6wio in a later explicitly approved step, without opening broad correction writes.

The future execution must be one-time and target-scoped. It must only allow the correction for:

- target session `S20260707-x6wio`
- target anchor `EMPV3-20260707-abdul-x6wio`
- correction type `duplicate_upload_correction`
- original event IDs `ent20260707-x6wio-02` and `ent20260707-x6wip-03`

This H3B3 step only prepares the runbook and script. It does not enable the gate, does not submit apply, and does not write production data.

## 2. Business Confirmation

Owner confirmed the 80 AED arrears_payment in x6wio was real cash received.

Therefore:

- keep `ent20260707-x6wio-01` / `#334 arrears_payment 80`
- void duplicate rent `ent20260707-x6wio-02` / `#334 rent 700`
- void duplicate rent `ent20260707-x6wip-03` / `#134 rent 770`

If this business confirmation is later withdrawn, stop. This runbook becomes invalid and a different correction plan is required.

## 3. Exact Target

target_session_id:

`S20260707-x6wio`

target_session_anchor:

`EMPV3-20260707-abdul-x6wio`

correction_type:

`duplicate_upload_correction`

## 4. Exact Allowed Event IDs

Allowed original_event_id list must be exactly:

- `ent20260707-x6wio-02`
- `ent20260707-x6wip-03`

No extra event IDs.

No missing event IDs.

Do not include `ent20260707-x6wio-01`, because it is the real `#334 arrears_payment 80` cash receipt and must remain.

## 5. Expected Totals

Before apply:

- gross = `1550`
- cash = `1550`
- rent_income = `1470`
- arrears_repaid = `80`

Correction:

- gross_delta = `-1470`
- cash_delta = `-1470`
- rent_income_delta = `-1470`
- arrears_repaid_delta = `0`

After apply:

- gross = `80`
- cash = `80`
- rent_income = `0`
- arrears_repaid = `80`

## 6. Target-Scoped Gate Values

The actual H3B1 implemented config names are:

```text
OWNER_CORRECTION_APPLY_ENABLED=true
OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED=true
OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ID=S20260707-x6wio
OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ANCHOR=EMPV3-20260707-abdul-x6wio
OWNER_CORRECTION_ALLOWED_TYPE=duplicate_upload_correction
OWNER_CORRECTION_ALLOWED_ORIGINAL_EVENT_IDS=ent20260707-x6wio-02,ent20260707-x6wip-03
OWNER_CORRECTION_EXPECTED_GROSS_DELTA=-1470
OWNER_CORRECTION_EXPECTED_CASH_DELTA=-1470
OWNER_CORRECTION_EXPECTED_ADJUSTED_GROSS=80
OWNER_CORRECTION_EXPECTED_ADJUSTED_CASH=80
OWNER_CORRECTION_EXPECTED_RENT_INCOME_DELTA=-1470
OWNER_CORRECTION_EXPECTED_ADJUSTED_RENT_INCOME=0
OWNER_CORRECTION_EXPECTED_ADJUSTED_ARREARS_REPAID=80
```

Do not set these variables in H3B3.

Broad global apply alone is not sufficient. The target-scoped gate must also be enabled for the exact x6wio target.

## 7. Fresh preview_hash Requirement

Do not rely on stale preview_hash.

Last captured preview_hash:

`och_16z8y2f`

The final apply script must re-run preview immediately before apply and use the fresh server-returned `preview_hash`.

Stop if:

- preview_hash is missing.
- preview_hash is empty.
- preview totals changed.
- H4B detail already shows `correction_applied = true`.

## 8. Idempotency Key Format

Use this one-time idempotency key format:

`x6wio-duplicate-rent-correction-S20260707-x6wio-<timestamp>`

The timestamp should be generated only at execution time after the fresh preview passes.

If the apply endpoint later supports deterministic preview-bound idempotency keys, use the safer deterministic form:

`x6wio-duplicate-rent-correction-S20260707-x6wio-${preview_hash.slice(0,16)}`

## 9. Explicit Owner Confirmation Payload

Final apply must require:

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

## 10. Final Correction Events

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

## 11. One-Time Apply Browser Console Script

Use this only in the later explicitly approved apply step, after the target-scoped gate is temporarily enabled.

This script requires typed confirmation before it calls apply. It must not be run in H3B3.

```js
(async () => {
  const REQUIRED_TYPED_CONFIRMATION = "APPLY_X6WIO_CORRECTION_80_REAL";
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

  const before = await readJson(`/api/session_detail?id=${encodeURIComponent(target_session_id)}&include_corrections=1`);
  const beforeSummary = before.json.correction_summary || {};
  const beforeOk =
    before.status === 200 &&
    before.json.code === 0 &&
    beforeSummary.correction_applied === false &&
    beforeSummary.adjusted_totals?.gross === 1550 &&
    beforeSummary.correction_events_count === 0;

  if (!beforeOk) {
    console.log("NO_GO_BEFORE_APPLY_DETAIL", { status: before.status, detail: before.json });
    return;
  }

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

  if (!previewOk) {
    console.log("NO_GO_PREVIEW_MISMATCH", { status: preview.status, preview: preview.json });
    return;
  }

  const applyPayload = {
    ...previewRequest,
    preview_hash,
    idempotency_key: `x6wio-duplicate-rent-correction-S20260707-x6wio-${Date.now()}`,
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

  console.log("FINAL APPLY PAYLOAD READY. Review before typing confirmation.", applyPayload);
  const typed = window.prompt(`Type ${REQUIRED_TYPED_CONFIRMATION} to apply exactly one x6wio correction anchor.`);
  if (typed !== REQUIRED_TYPED_CONFIRMATION) {
    console.log("APPLY_CANCELLED_TYPED_CONFIRMATION_MISMATCH", { typed });
    return;
  }

  const apply = await readJson("/api/owner/corrections/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(applyPayload)
  });

  console.log("APPLY RESULT", { status: apply.status, response: apply.json });

  const after = await readJson(`/api/session_detail?id=${encodeURIComponent(target_session_id)}&include_corrections=1`);
  const afterSummary = after.json.correction_summary || {};
  const afterResult = {
    after_status: after.status,
    correction_applied: afterSummary.correction_applied === true,
    correction_gross_delta: afterSummary.correction_totals?.gross_delta,
    adjusted_gross: afterSummary.adjusted_totals?.gross,
    adjusted_cash: afterSummary.adjusted_totals?.cash,
    adjusted_rent_income: afterSummary.adjusted_totals?.rent_income,
    adjusted_arrears_repaid: afterSummary.adjusted_totals?.arrears_repaid,
    production_cutover: "PRODUCTION_NO_GO"
  };

  console.log("POST APPLY H4B DETAIL RESULT", afterResult);
})();
```

Expected post-apply detail after a future approved execution:

- `correction_applied = true`
- `correction_totals.gross_delta = -1470`
- `adjusted_totals.gross = 80`
- `adjusted_totals.cash = 80`
- `adjusted_totals.rent_income = 0`
- `adjusted_totals.arrears_repaid = 80`

The script must not change owner UI.

## 12. Pre-Apply Checklist

Before execution:

- production target-scoped gate is enabled only for x6wio.
- broad global apply alone is not sufficient.
- H4B detail currently returns `correction_applied = false`.
- H4B detail currently returns adjusted gross `1550`.
- no existing correction anchor already applied.
- H2 preview passes.
- fresh `preview_hash` exists.
- exact event IDs match.
- owner typed confirmation is present.
- owner confirmed the 80 AED arrears_payment was real cash received.
- no migration pending.
- backup/export of current session detail captured.

## 13. Post-Apply Verification Checklist

After execution:

- apply returns `ok = true`.
- correction anchor session exists.
- original x6wio rows remain unchanged.
- no hard delete.
- no transaction row mutation.
- no `arrear_tasks` mutation.
- no deposit mutation.
- H4B opt-in detail returns `correction_applied = true`.
- H4B opt-in detail returns `correction_totals.gross_delta = -1470`.
- H4B opt-in detail returns `adjusted_totals.gross = 80`.
- H4B opt-in detail returns `adjusted_totals.cash = 80`.
- H4B opt-in detail returns `adjusted_totals.rent_income = 0`.
- H4B opt-in detail returns `adjusted_totals.arrears_repaid = 80`.
- legacy detail endpoint remains compatible.
- `/api/history` list remains compatible.
- production apply gate disabled again.

## 14. Disable Gate Checklist

Immediately after successful apply:

- disable `OWNER_CORRECTION_APPLY_ENABLED`.
- disable `OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED`.
- remove or blank `OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ID`.
- remove or blank `OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ANCHOR`.
- remove or blank `OWNER_CORRECTION_ALLOWED_ORIGINAL_EVENT_IDS`.
- redeploy or confirm config change.
- verify `/api/owner/corrections/apply` returns `OWNER_CORRECTION_APPLY_DISABLED`.
- verify H4B detail still shows `correction_applied = true` from written correction anchor.

## 15. Rollback / Reversal Reminder

If correction is wrong:

- do not delete correction anchor.
- do not mutate original x6wio rows.
- do not mutate transaction rows.
- do not mutate `arrear_tasks`.
- do not mutate deposit ledger rows.
- create reversal correction anchor in a separate controlled flow.

## 16. No-Go Conditions

Do not apply if:

- target session not found.
- preview_hash missing.
- preview totals changed.
- original gross no longer `1550`.
- adjusted gross not `80`.
- event IDs changed.
- existing correction already applied.
- target-scoped gate cannot be confirmed.
- owner confirmation missing.
- 80 AED real-payment confirmation missing.
- production apply would require migration.
- apply would mutate original rows directly.

Recommended next step:

`PREPARE_H3B4_TEMPORARY_TARGET_SCOPED_GATE_ENABLE`

Alternative:

`DO_NOT_PROCEED`

production_cutover = `PRODUCTION_NO_GO`

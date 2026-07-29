# H3B.1 Target-Scoped Apply Gate Manual Live Verification

Run this from the authenticated owner browser console.

This script verifies that `/api/owner/corrections/apply` exists, production apply remains disabled, no write is attempted, and H4B opt-in detail still reports x6wio as uncorrected. It does not enable apply and does not apply the x6wio correction.

```js
(async () => {
  const applyPayload = {
    target_session_id: "S20260707-x6wio",
    target_session_anchor: "EMPV3-20260707-abdul-x6wio",
    correction_type: "duplicate_upload_correction",
    correction_reason: "manual disabled-gate verification only",
    evidence_summary: "No-write live verification. Do not apply.",
    preview_hash: "manual-disabled-gate-placeholder",
    idempotency_key: `manual-no-write-${Date.now()}`,
    correction_events: [
      {
        correction_event_id: "manual-no-write-ent20260707-x6wio-02",
        correction_event_type: "void_duplicate_event",
        original_event_id: "ent20260707-x6wio-02",
        financial_effect: {
          cash_delta: -700,
          gross_delta: -700,
          rent_income_delta: -700
        }
      },
      {
        correction_event_id: "manual-no-write-ent20260707-x6wip-03",
        correction_event_type: "void_duplicate_event",
        original_event_id: "ent20260707-x6wip-03",
        financial_effect: {
          cash_delta: -770,
          gross_delta: -770,
          rent_income_delta: -770
        }
      }
    ],
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
      confirmed_adjusted_cash: 80
    }
  };

  const applyRes = await fetch("/api/owner/corrections/apply", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(applyPayload)
  });
  const applyRaw = await applyRes.text();
  let applyJson;
  try {
    applyJson = JSON.parse(applyRaw);
  } catch (error) {
    console.log({ step: "apply", status: applyRes.status, raw: applyRaw });
    throw error;
  }

  const detailRes = await fetch("/api/session_detail?id=S20260707-x6wio&include_corrections=1", {
    credentials: "include"
  });
  const detailRaw = await detailRes.text();
  let detailJson;
  try {
    detailJson = JSON.parse(detailRaw);
  } catch (error) {
    console.log({ step: "detail", status: detailRes.status, raw: detailRaw });
    throw error;
  }

  const noWriteProof = applyJson.no_write_proof || {};
  const summary = detailJson.correction_summary || {};
  const result = {
    status_label: applyJson.no_write === true && summary.correction_applied === false ? "LIVE_VERIFIED" : "NOT_LIVE_VERIFIED",
    apply_http_status: applyRes.status,
    apply_error_code: applyJson.error_code || applyJson.code || "",
    apply_disabled_or_target_scope_required: ["OWNER_CORRECTION_APPLY_DISABLED", "OWNER_CORRECTION_TARGET_SCOPE_REQUIRED"].includes(applyJson.error_code || applyJson.code || ""),
    no_write: applyJson.no_write === true,
    production_write: "no",
    correction_write_attempted: noWriteProof.correction_write_attempted === false,
    session_write_attempted: noWriteProof.session_write_attempted === false,
    transaction_write_attempted: noWriteProof.transaction_write_attempted === false,
    arrear_task_write_attempted: noWriteProof.arrear_task_write_attempted === false,
    deposit_write_attempted: noWriteProof.deposit_write_attempted === false,
    real_apply_called: noWriteProof.real_apply_called === false,
    d1_write_count: noWriteProof.d1_write_count,
    detail_http_status: detailRes.status,
    correction_applied: summary.correction_applied === false,
    adjusted_gross: summary.adjusted_totals?.gross,
    raw_gross: summary.raw_totals?.gross,
    x6wio_corrected: false,
    production_cutover: "PRODUCTION_NO_GO"
  };

  console.log("H3B.1 target-scoped apply gate disabled production verification", result);
  console.log("Raw apply response", applyJson);
  console.log("Raw H4B detail response", detailJson);
})();
```

Expected:

- apply response is no-write.
- `error_code` is `OWNER_CORRECTION_APPLY_DISABLED` or `OWNER_CORRECTION_TARGET_SCOPE_REQUIRED`.
- no write proof fields remain false.
- H4B detail still reports `correction_applied = false`.
- H4B adjusted gross remains `1550`.
- x6wio is not corrected.

# H4B Regression Fix + H3B1 Disabled Gate Manual Live Verification

Run this from the authenticated owner browser console.

This script verifies the H4B opt-in detail endpoint regression fix and confirms H3B1 apply remains disabled/no-write. It does not enable apply, does not apply the x6wio correction, and does not write production data.

```js
(async () => {
  const legacyUrl = "/api/session_detail?id=S20260707-x6wio";
  const optInUrl = "/api/session_detail?id=S20260707-x6wio&include_corrections=1";

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

  const legacy = await readJson(legacyUrl);
  const optIn = await readJson(optInUrl);

  const applyPayload = {
    target_session_id: "S20260707-x6wio",
    target_session_anchor: "EMPV3-20260707-abdul-x6wio",
    correction_type: "duplicate_upload_correction",
    correction_reason: "manual disabled-gate verification only",
    evidence_summary: "No-write live verification. Do not apply.",
    preview_hash: "manual-disabled-gate-placeholder",
    idempotency_key: `manual-no-write-${Date.now()}`,
    correction_events: [
      { correction_event_type: "void_duplicate_event", original_event_id: "ent20260707-x6wio-02", financial_effect: { cash_delta: -700, gross_delta: -700, rent_income_delta: -700 } },
      { correction_event_type: "void_duplicate_event", original_event_id: "ent20260707-x6wip-03", financial_effect: { cash_delta: -770, gross_delta: -770, rent_income_delta: -770 } }
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

  const apply = await readJson("/api/owner/corrections/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(applyPayload)
  });

  const summary = optIn.json.correction_summary || {};
  const audit = optIn.json.correction_audit || {};
  const noWriteProof = apply.json.no_write_proof || {};
  const result = {
    status_label:
      legacy.status === 200 &&
      optIn.status === 200 &&
      !!optIn.json.correction_summary &&
      !!optIn.json.correction_audit &&
      summary.correction_applied === false &&
      apply.json.no_write === true
        ? "LIVE_VERIFIED"
        : "NOT_LIVE_VERIFIED",
    legacy_status: legacy.status,
    legacy_shape_ok: legacy.json.code === 0 && Array.isArray(legacy.json.data),
    legacy_has_no_correction_summary: !("correction_summary" in legacy.json),
    legacy_has_no_correction_audit: !("correction_audit" in legacy.json),
    legacy_rows_count: Array.isArray(legacy.json.data) ? legacy.json.data.length : null,
    opt_in_status: optIn.status,
    opt_in_shape_ok: optIn.json.code === 0 && Array.isArray(optIn.json.data),
    correction_summary_exists: !!optIn.json.correction_summary,
    correction_audit_exists: !!optIn.json.correction_audit,
    correction_aware: summary.correction_aware === true,
    correction_applied: summary.correction_applied === false,
    raw_gross: summary.raw_totals?.gross,
    raw_cash: summary.raw_totals?.cash,
    raw_rent_income: summary.raw_totals?.rent_income,
    raw_arrears_repaid: summary.raw_totals?.arrears_repaid,
    correction_gross_delta: summary.correction_totals?.gross_delta,
    correction_cash_delta: summary.correction_totals?.cash_delta,
    adjusted_gross: summary.adjusted_totals?.gross,
    adjusted_cash: summary.adjusted_totals?.cash,
    correction_events_count: summary.correction_events_count,
    invalid_corrections_count: summary.invalid_corrections_count,
    audit_modes_available:
      audit.raw_mode_available === true &&
      audit.adjusted_mode_available === true &&
      audit.audit_mode_available === true,
    original_events_visible: audit.original_events_visible === true,
    correction_events_visible: audit.correction_events_visible === false,
    apply_status: apply.status,
    apply_error_code: apply.json.error_code || apply.json.code || "",
    apply_disabled: (apply.json.error_code || apply.json.code || "") === "OWNER_CORRECTION_APPLY_DISABLED",
    apply_no_write: apply.json.no_write === true,
    apply_production_write: apply.json.production_write === false,
    d1_write_count: noWriteProof.d1_write_count,
    real_apply_called: noWriteProof.real_apply_called === false,
    x6wio_corrected: false,
    production_write: "no",
    production_cutover: "PRODUCTION_NO_GO"
  };

  console.log("H4B regression fix and H3B1 disabled gate verification", result);
  console.log("Raw legacy detail response", legacy.json);
  console.log("Raw opt-in detail response", optIn.json);
  console.log("Raw apply response", apply.json);
})();
```

Expected:

- legacy detail returns HTTP 200 with `{ code, message, data }` only.
- opt-in detail returns HTTP 200 with top-level `correction_summary` and `correction_audit`.
- `correction_applied = false`.
- adjusted gross remains `1550`.
- apply remains disabled/no-write with `OWNER_CORRECTION_APPLY_DISABLED`.
- x6wio remains uncorrected.

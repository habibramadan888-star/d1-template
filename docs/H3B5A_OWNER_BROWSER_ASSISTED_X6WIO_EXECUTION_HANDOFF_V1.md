# H3B5A Owner-Browser Assisted x6wio Execution Handoff V1

Date: 2026-07-08

Status: handoff package only. No production apply enabled in this step. No correction applied to x6wio in this step. No correction anchor written in this step. No production data changed. No migration. No deploy.

## 1. Why Shell 401 Is Expected

Owner correction APIs require an authenticated owner browser session.

The shell does not have owner login cookies, so:

- `GET /api/session_detail?id=S20260707-x6wio&include_corrections=1` returning HTTP `401` from shell is expected.
- HTTP `401` from shell is not a production bug.
- Do not bypass authentication.
- Do not weaken auth.
- Do not create a temporary unauthenticated endpoint.
- Do not print secrets/tokens/cookies/passwords.
- Do not paste or print tokens, cookies, passwords, or session headers.

Because Codex does not have authenticated owner browser access, the final H3B5 production correction must be executed from the owner's logged-in browser console.

## 2. Exact Correction Target

target_session_id:

`S20260707-x6wio`

target_session_anchor:

`EMPV3-20260707-abdul-x6wio`

correction_type:

`duplicate_upload_correction`

Business confirmation:

Owner confirmed the 80 AED arrears_payment in x6wio was real cash received.

Keep:

- `ent20260707-x6wio-01` / `#334 arrears_payment 80`

Void by additive correction anchor:

- `ent20260707-x6wio-02` / `#334 rent 700 duplicate`
- `ent20260707-x6wip-03` / `#134 rent 770 duplicate`

Expected final adjusted result:

- gross = `80`
- cash = `80`
- rent_income = `0`
- arrears_repaid = `80`

## 3. Owner Browser Pre-Check Script

Run this only from the authenticated owner browser console.

This script verifies H4B detail and H2 preview, prints the fresh `preview_hash`, and prints the final apply payload for review. It does not submit apply.

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
      correction_reason: "Duplicate #334 rent 700 already uploaded in original session w1ofc.",
      evidence_summary: "This record original_local_entry_id points to ent20260707-w1ofc-01.",
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
      projection_effect: {
        affects_owner_finance: true,
        affects_arrears_state: false,
        affects_deposit_state: false,
        affects_occupancy_state: false,
        affects_checkout_eligibility: false,
        affects_access_network_future: false
      }
    },
    {
      correction_event_type: "void_duplicate_event",
      original_event_id: "ent20260707-x6wip-03",
      original_session_id: "S20260707-x6wio",
      original_anchor: "EMPV3-20260707-abdul-x6wio",
      affected_bed: "134",
      affected_event_type: "rent",
      correction_reason: "Duplicate #134 rent 770 already uploaded in original session w1ofc.",
      evidence_summary: "This record original_local_entry_id points to ent20260707-w1ofc-02.",
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
      projection_effect: {
        affects_owner_finance: true,
        affects_arrears_state: false,
        affects_deposit_state: false,
        affects_occupancy_state: false,
        affects_checkout_eligibility: false,
        affects_access_network_future: false
      }
    }
  ];

  const readJson = async (url, options = {}) => {
    const res = await fetch(url, { credentials: "include", ...options });
    const raw = await res.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch (error) {
      console.log("NON_JSON_RESPONSE", { url, status: res.status, raw });
      throw error;
    }
    return { url, status: res.status, json, raw };
  };

  const detail = await readJson(`/api/session_detail?id=${encodeURIComponent(target_session_id)}&include_corrections=1`);
  const summary = detail.json.correction_summary || {};
  const audit = detail.json.correction_audit || {};
  const warnings = Array.isArray(summary.warnings) ? summary.warnings : [];

  const detailOk =
    detail.status === 200 &&
    Boolean(detail.json.correction_summary) &&
    Boolean(detail.json.correction_audit) &&
    summary.correction_applied === false &&
    summary.correction_events_count === 0 &&
    summary.raw_totals?.gross === 1550 &&
    summary.adjusted_totals?.gross === 1550 &&
    warnings.length === 0;

  if (!detailOk) {
    console.log("NO_GO_PRECHECK_H4B_DETAIL", { status: detail.status, summary, audit, warnings });
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
  const invalidCorrections = preview.json.invalid_corrections || [];
  const previewOk =
    preview.status === 200 &&
    preview.json.ok !== false &&
    preview.json.original_totals?.gross === 1550 &&
    preview.json.correction_totals?.gross_delta === -1470 &&
    preview.json.adjusted_totals?.gross === 80 &&
    preview.json.original_totals?.cash === 1550 &&
    preview.json.correction_totals?.cash_delta === -1470 &&
    preview.json.adjusted_totals?.cash === 80 &&
    preview.json.adjusted_totals?.rent_income === 0 &&
    preview.json.adjusted_totals?.arrears_repaid === 80 &&
    preview.json.correction_events_count === 2 &&
    Array.isArray(invalidCorrections) &&
    invalidCorrections.length === 0 &&
    typeof preview_hash === "string" &&
    preview_hash.length > 0;

  if (!previewOk) {
    console.log("NO_GO_PRECHECK_PREVIEW", { status: preview.status, preview: preview.json });
    return;
  }

  const finalApplyPayload = {
    ...previewRequest,
    preview_hash,
    idempotency_key: `x6wio-duplicate-rent-correction-S20260707-x6wio-${preview_hash.slice(0, 16)}`,
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

  console.log("H3B5A PRECHECK RESULT", {
    status_label: "PRECHECK_READY",
    detail_status: detail.status,
    correction_applied: summary.correction_applied,
    raw_gross: summary.raw_totals?.gross,
    adjusted_gross_before: summary.adjusted_totals?.gross,
    preview_status: preview.status,
    preview_hash,
    correction_gross_delta: preview.json.correction_totals?.gross_delta,
    adjusted_gross_after_preview: preview.json.adjusted_totals?.gross,
    adjusted_cash_after_preview: preview.json.adjusted_totals?.cash,
    adjusted_rent_income_after_preview: preview.json.adjusted_totals?.rent_income,
    adjusted_arrears_repaid_after_preview: preview.json.adjusted_totals?.arrears_repaid,
    invalid_corrections_count: invalidCorrections.length,
    final_apply_payload_submitted: false,
    production_write: "no"
  });
  console.log("H3B5A FINAL APPLY PAYLOAD PREPARED BUT NOT SUBMITTED", finalApplyPayload);
})();
```

## 4. Temporary Gate Enable Instructions

Do not execute these instructions in H3B5A.

The exact implemented config names are:

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

The gate must be target-scoped only:

- target_session_id = `S20260707-x6wio`
- target_session_anchor = `EMPV3-20260707-abdul-x6wio`
- correction_type = `duplicate_upload_correction`
- allowed original_event_id list = `ent20260707-x6wio-02,ent20260707-x6wip-03`
- expected gross_delta = `-1470`
- expected cash_delta = `-1470`
- expected adjusted gross = `80`
- expected adjusted cash = `80`

Broad global apply alone must not be enough. Both `OWNER_CORRECTION_APPLY_ENABLED=true` and `OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED=true` with the exact allowlist must be required.

If config propagation cannot be performed and reversed safely, stop.

## 5. Final Owner-Browser Apply Script

Run this only after:

- owner browser pre-check passed
- target-scoped gate enabled
- owner intentionally proceeds

It re-runs H4B detail and H2 preview, uses a fresh `preview_hash`, requires exact typed confirmation, submits apply once, then verifies H4B detail after apply.

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
      correction_reason: "Duplicate #334 rent 700 already uploaded in original session w1ofc.",
      evidence_summary: "This record original_local_entry_id points to ent20260707-w1ofc-01.",
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
      projection_effect: {
        affects_owner_finance: true,
        affects_arrears_state: false,
        affects_deposit_state: false,
        affects_occupancy_state: false,
        affects_checkout_eligibility: false,
        affects_access_network_future: false
      }
    },
    {
      correction_event_type: "void_duplicate_event",
      original_event_id: "ent20260707-x6wip-03",
      original_session_id: "S20260707-x6wio",
      original_anchor: "EMPV3-20260707-abdul-x6wio",
      affected_bed: "134",
      affected_event_type: "rent",
      correction_reason: "Duplicate #134 rent 770 already uploaded in original session w1ofc.",
      evidence_summary: "This record original_local_entry_id points to ent20260707-w1ofc-02.",
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
      projection_effect: {
        affects_owner_finance: true,
        affects_arrears_state: false,
        affects_deposit_state: false,
        affects_occupancy_state: false,
        affects_checkout_eligibility: false,
        affects_access_network_future: false
      }
    }
  ];

  const readJson = async (url, options = {}) => {
    const res = await fetch(url, { credentials: "include", ...options });
    const raw = await res.text();
    const json = JSON.parse(raw);
    return { url, status: res.status, json, raw };
  };

  const before = await readJson(`/api/session_detail?id=${encodeURIComponent(target_session_id)}&include_corrections=1`);
  const beforeSummary = before.json.correction_summary || {};
  if (
    before.status !== 200 ||
    beforeSummary.correction_applied !== false ||
    beforeSummary.raw_totals?.gross !== 1550 ||
    beforeSummary.adjusted_totals?.gross !== 1550 ||
    beforeSummary.correction_events_count !== 0
  ) {
    console.log("NO_GO_APPLY_BEFORE_DETAIL", { status: before.status, summary: beforeSummary });
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
    preview.json.ok !== false &&
    preview.json.original_totals?.gross === 1550 &&
    preview.json.correction_totals?.gross_delta === -1470 &&
    preview.json.adjusted_totals?.gross === 80 &&
    preview.json.correction_totals?.cash_delta === -1470 &&
    preview.json.adjusted_totals?.cash === 80 &&
    preview.json.adjusted_totals?.rent_income === 0 &&
    preview.json.adjusted_totals?.arrears_repaid === 80 &&
    preview.json.correction_events_count === 2 &&
    Array.isArray(preview.json.invalid_corrections || []) &&
    (preview.json.invalid_corrections || []).length === 0 &&
    preview_hash.length > 0;

  if (!previewOk) {
    console.log("NO_GO_APPLY_PREVIEW", { status: preview.status, preview: preview.json });
    return;
  }

  const applyPayload = {
    ...previewRequest,
    preview_hash,
    idempotency_key: `x6wio-duplicate-rent-correction-S20260707-x6wio-${preview_hash.slice(0, 16)}`,
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

  console.log("FINAL APPLY PAYLOAD READY. Review before typed confirmation.", applyPayload);
  const typed = window.prompt(`Type ${REQUIRED_TYPED_CONFIRMATION} to submit exactly one x6wio correction anchor.`);
  if (typed !== REQUIRED_TYPED_CONFIRMATION) {
    console.log("APPLY_CANCELLED_TYPED_CONFIRMATION_MISMATCH", { submitted: false });
    return;
  }

  const apply = await readJson("/api/owner/corrections/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(applyPayload)
  });
  console.log("H3B5 APPLY RESPONSE", { status: apply.status, response: apply.json });

  const after = await readJson(`/api/session_detail?id=${encodeURIComponent(target_session_id)}&include_corrections=1`);
  const afterSummary = after.json.correction_summary || {};
  const afterAudit = after.json.correction_audit || {};
  const afterResult = {
    status: after.status,
    correction_applied: afterSummary.correction_applied === true,
    correction_events_count: afterSummary.correction_events_count,
    correction_gross_delta: afterSummary.correction_totals?.gross_delta,
    correction_cash_delta: afterSummary.correction_totals?.cash_delta,
    adjusted_gross: afterSummary.adjusted_totals?.gross,
    adjusted_cash: afterSummary.adjusted_totals?.cash,
    adjusted_rent_income: afterSummary.adjusted_totals?.rent_income,
    adjusted_arrears_repaid: afterSummary.adjusted_totals?.arrears_repaid,
    original_events_visible: afterAudit.original_events_visible === true,
    correction_events_visible: afterAudit.correction_events_visible === true
  };

  console.log("H3B5 POST APPLY DETAIL RESULT", afterResult);
})();
```

## 6. Gate Disable Instructions And Verification Script

Immediately after successful apply:

- disable global apply
- disable target-scoped gate
- clear or inert target allowlist
- redeploy or confirm config propagation if needed

Then run this in the authenticated owner browser console:

```js
(async () => {
  const target_session_id = "S20260707-x6wio";
  const readJson = async (url, options = {}) => {
    const res = await fetch(url, { credentials: "include", ...options });
    const raw = await res.text();
    const json = JSON.parse(raw);
    return { url, status: res.status, json, raw };
  };

  const disabledPayload = {
    target_session_id,
    target_session_anchor: "EMPV3-20260707-abdul-x6wio",
    correction_type: "duplicate_upload_correction",
    correction_reason: "After-disable gate check only. Do not write.",
    evidence_summary: "H3B5A after-disable verification.",
    correction_events: [],
    preview_hash: "DUMMY-H3B5A-AFTER-DISABLE",
    idempotency_key: "DUMMY-H3B5A-AFTER-DISABLE"
  };

  const disabled = await readJson("/api/owner/corrections/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(disabledPayload)
  });

  const detail = await readJson(`/api/session_detail?id=${encodeURIComponent(target_session_id)}&include_corrections=1`);
  const summary = detail.json.correction_summary || {};

  console.log("H3B5A AFTER DISABLE VERIFICATION", {
    apply_status: disabled.status,
    apply_disabled: disabled.json.error_code === "OWNER_CORRECTION_APPLY_DISABLED",
    no_write: disabled.json.no_write === true,
    production_write_false: disabled.json.production_write === false,
    real_apply_called_false: disabled.json.real_apply_called === false || disabled.json.real_apply_called == null,
    detail_status: detail.status,
    correction_applied: summary.correction_applied === true,
    adjusted_gross: summary.adjusted_totals?.gross,
    production_cutover: "PRODUCTION_NO_GO"
  });
})();
```

Expected after-disable verification:

- `OWNER_CORRECTION_APPLY_DISABLED`
- `no_write = true`
- `production_write = false`
- `real_apply_called = false` or absent
- H4B detail still shows `correction_applied = true`
- H4B detail still shows adjusted gross `80`

## 7. No-Go Conditions

Do not proceed if:

- owner browser pre-check fails
- preview_hash missing
- original gross not `1550`
- adjusted gross not `80`
- event IDs differ
- existing correction already applied
- target-scoped gate cannot be verified
- broad global apply alone could write
- owner confirmation missing
- apply would require migration
- apply would mutate original rows directly
- apply would mutate transaction rows
- apply would mutate `arrear_tasks`
- apply would mutate deposit ledger
- any script response is non-JSON where JSON is expected
- any endpoint returns unexpected HTTP status

## 8. Forbidden In H3B5A

Do not:

- enable production apply
- apply correction to x6wio
- write correction anchor
- modify production data
- add migration
- bypass authentication
- create unauthenticated apply endpoint
- change owner UI
- change employee UI
- modify transactions
- modify `arrear_tasks`
- modify deposit ledger
- print secrets/tokens/cookies/passwords

Recommended next step:

`OWNER_RUN_PRECHECK_IN_AUTHENTICATED_BROWSER`

Alternative:

`DO_NOT_PROCEED`

production_cutover = `PRODUCTION_NO_GO`

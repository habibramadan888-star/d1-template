# H3B4 Temporary Target-Scoped Gate Enable Package V1

Date: 2026-07-08

Status: preparation only. No production apply enabled in this step. No production environment variables set in this step. No correction applied to x6wio in this step. No correction anchor written in this step. No production data changed. No migration. No deploy.

## 1. Purpose

This package prepares a narrow one-time production gate enable for x6wio only.

It must not open broad correction writes. The future enable must only allow:

- target session `S20260707-x6wio`
- target anchor `EMPV3-20260707-abdul-x6wio`
- correction type `duplicate_upload_correction`
- original event IDs `ent20260707-x6wio-02` and `ent20260707-x6wip-03`

H3B4 does not execute the enable sequence and does not submit an apply request.

## 2. Current Verified Prerequisites

- H2 preview `LIVE_VERIFIED`
- H3B1 target-scoped gate `LIVE_VERIFIED`
- H4B detail endpoint `LIVE_VERIFIED`
- H3B2 preflight `LIVE_VERIFIED`
- H3B3 runbook `TEST_PASS`
- Owner confirmed the 80 AED arrears_payment in x6wio was real cash received
- production apply currently disabled
- x6wio not corrected
- correction anchor not written
- production data changed = no
- migration = no

## 3. Exact Implemented Config Names

These names come from the actual H3B1 implementation in `deploy-worker/src/index.js`:

- `ownerCorrectionApplyEnabled(env)` reads `env.OWNER_CORRECTION_APPLY_ENABLED`
- `ownerCorrectionTargetScopeConfig(env)` reads the target-scoped values below
- `handleOwnerCorrectionApply` checks `ownerCorrectionApplyEnabled(env)` first
- `handleOwnerCorrectionApply` then calls `validateOwnerCorrectionTargetScopedApplyAuthorization(...)`
- the write path is after target-scoped authorization

| Name | Code path | Kind | Required H3B5 value | Notes |
|---|---|---|---|---|
| `OWNER_CORRECTION_APPLY_ENABLED` | `ownerCorrectionApplyEnabled(env)` | Worker environment variable / Worker var | `true` | Broad global gate. Not sufficient by itself. |
| `OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `true` | Target-scoped gate. Required in addition to broad gate. |
| `OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ID` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `S20260707-x6wio` | Exact target only. |
| `OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ANCHOR` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `EMPV3-20260707-abdul-x6wio` | Exact target only. |
| `OWNER_CORRECTION_ALLOWED_TYPE` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `duplicate_upload_correction` | Exact correction type only. |
| `OWNER_CORRECTION_ALLOWED_ORIGINAL_EVENT_IDS` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `ent20260707-x6wio-02,ent20260707-x6wip-03` | Exact two-event allowlist only. |
| `OWNER_CORRECTION_EXPECTED_GROSS_DELTA` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `-1470` | Expected correction total. |
| `OWNER_CORRECTION_EXPECTED_CASH_DELTA` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `-1470` | Expected correction total. |
| `OWNER_CORRECTION_EXPECTED_ADJUSTED_GROSS` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `80` | Expected adjusted total. |
| `OWNER_CORRECTION_EXPECTED_ADJUSTED_CASH` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `80` | Expected adjusted total. |
| `OWNER_CORRECTION_EXPECTED_RENT_INCOME_DELTA` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `-1470` | Expected correction total. |
| `OWNER_CORRECTION_EXPECTED_ADJUSTED_RENT_INCOME` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `0` | Expected adjusted total. |
| `OWNER_CORRECTION_EXPECTED_ADJUSTED_ARREARS_REPAID` | `ownerCorrectionTargetScopeConfig(env)` | Worker environment variable / Worker var | `80` | Expected adjusted total. |

These are not secrets. They are target-scoped safety configuration values. Do not store sensitive environment values in this document.

Runtime Cloudflare configuration propagation must be confirmed before H3B5. If the current deployment path cannot update these Worker vars safely and reversibly, execution is `NO-GO`.

## 4. Required One-Time Values

target_session_id:

`S20260707-x6wio`

target_session_anchor:

`EMPV3-20260707-abdul-x6wio`

correction_type:

`duplicate_upload_correction`

allowed original_event_id list:

- `ent20260707-x6wio-02`
- `ent20260707-x6wip-03`

expected correction:

- gross_delta = `-1470`
- cash_delta = `-1470`
- rent_income_delta = `-1470`

expected adjusted:

- gross = `80`
- cash = `80`
- rent_income = `0`
- arrears_repaid = `80`

The 80 AED arrears_payment event `ent20260707-x6wio-01` must not be in the void allowlist.

## 5. Broad Global Gate Must Not Be Enough

Broad global apply enable alone must not permit writes.

Proof from `tests/h3b1-target-scoped-apply-authorization.spec.mjs`:

- the test `target-scoped gate is fail-closed when disabled or missing config` verifies target scope rejects when `OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED` is disabled or required config is missing
- the test `apply endpoint requires broad gate plus target-scoped gate before write path` verifies the handler checks `ownerCorrectionApplyEnabled(env)` first, then calls `validateOwnerCorrectionTargetScopedApplyAuthorization`, and only then reaches the write path
- the same test verifies `OWNER_CORRECTION_TARGET_SCOPE_REQUIRED`
- the same test verifies there is no write call before the target-scoped authorization point

The execution plan must require both:

- global apply enable: `OWNER_CORRECTION_APPLY_ENABLED=true`
- target-scoped allow enable: `OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED=true` plus exact target allowlist values

## 6. Enable Sequence

Prepare these steps only. Do not execute them in H3B4.

A. Capture current configuration state:

- current worker version
- current git commit
- current correction apply gate values without printing secrets
- current H4B opt-in detail for `S20260707-x6wio`
- current H2 preview response
- current `/api/owner/corrections/apply` disabled response

B. Set only the minimum target-scoped variables:

```text
# DO NOT RUN IN H3B4
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

C. Enable global apply:

```text
# DO NOT RUN IN H3B4
OWNER_CORRECTION_APPLY_ENABLED=true
```

D. Enable target-scoped apply:

```text
# DO NOT RUN IN H3B4
OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED=true
```

E. Redeploy or confirm config propagation if required:

```text
# DO NOT RUN IN H3B4
# Use the project's approved Worker configuration propagation command.
# If propagation requires deployment, run it only in the explicitly approved H3B5 preparation window.
```

If Cloudflare Workers require redeploy for vars, the exact deploy command must be confirmed from the current project deployment procedure before execution. H3B4 does not run it.

F. Run disabled/non-target rejection tests:

- wrong target rejected
- wrong original_event_id rejected
- wrong expected total rejected
- no write attempts in rejected cases

G. Run x6wio target preflight:

- H4B detail before apply still `correction_applied=false`
- H2 preview still gross_delta `-1470`
- H2 preview still adjusted gross `80`
- fresh `preview_hash` captured

H. Only then proceed to the apply step:

`H3B5_ONE_TIME_X6WIO_APPLY_EXECUTION`

## 7. Disable Sequence

Immediately after a future successful apply:

A. Disable global apply:

```text
# DO NOT RUN IN H3B4
OWNER_CORRECTION_APPLY_ENABLED=false
```

B. Disable target-scoped apply:

```text
# DO NOT RUN IN H3B4
OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED=false
```

C. Clear target-specific allowlist values or set them to inert values:

```text
# DO NOT RUN IN H3B4
OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ID=
OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ANCHOR=
OWNER_CORRECTION_ALLOWED_TYPE=
OWNER_CORRECTION_ALLOWED_ORIGINAL_EVENT_IDS=
OWNER_CORRECTION_EXPECTED_GROSS_DELTA=
OWNER_CORRECTION_EXPECTED_CASH_DELTA=
OWNER_CORRECTION_EXPECTED_ADJUSTED_GROSS=
OWNER_CORRECTION_EXPECTED_ADJUSTED_CASH=
OWNER_CORRECTION_EXPECTED_RENT_INCOME_DELTA=
OWNER_CORRECTION_EXPECTED_ADJUSTED_RENT_INCOME=
OWNER_CORRECTION_EXPECTED_ADJUSTED_ARREARS_REPAID=
```

D. Redeploy or confirm config propagation if required.

E. Verify `/api/owner/corrections/apply` returns `OWNER_CORRECTION_APPLY_DISABLED`.

F. Verify H4B detail still shows `correction_applied=true` after the future correction anchor exists.

## 8. Verification Scripts

These scripts are prepared for manual browser console verification. They must be run only from an authenticated owner browser session. H3B4 does not run them.

### Script A: Before Enabling

Confirms H4B detail is uncorrected and apply is disabled.

```js
(async () => {
  const target_session_id = "S20260707-x6wio";
  const readJson = async (url, options = {}) => {
    const res = await fetch(url, { credentials: "include", ...options });
    const raw = await res.text();
    const json = JSON.parse(raw);
    return { url, status: res.status, json, raw };
  };

  const detail = await readJson(`/api/session_detail?id=${encodeURIComponent(target_session_id)}&include_corrections=1`);
  const summary = detail.json.correction_summary || {};

  const disabledPayload = {
    target_session_id,
    target_session_anchor: "EMPV3-20260707-abdul-x6wio",
    correction_type: "duplicate_upload_correction",
    correction_reason: "Disabled gate check only. Do not write.",
    evidence_summary: "H3B4 before-enable disabled gate check.",
    correction_events: [],
    preview_hash: "DUMMY-H3B4-BEFORE-ENABLE",
    idempotency_key: "DUMMY-H3B4-BEFORE-ENABLE"
  };

  const disabled = await readJson("/api/owner/corrections/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(disabledPayload)
  });

  console.log("H3B4 SCRIPT A BEFORE ENABLE RESULT", {
    detail_status: detail.status,
    correction_applied: summary.correction_applied === false,
    raw_gross: summary.raw_totals?.gross,
    adjusted_gross: summary.adjusted_totals?.gross,
    apply_status: disabled.status,
    apply_disabled: disabled.json.error_code === "OWNER_CORRECTION_APPLY_DISABLED",
    no_write: disabled.json.no_write === true,
    production_write: "no"
  });
})();
```

### Script B: After Temporary Enable, Before Apply

Confirms rejection cases and prepares the exact x6wio payload. It does not submit the exact apply payload unless a future H3B5 operator enters the required typed confirmation.

```js
(async () => {
  const REQUIRED_TYPED_CONFIRMATION = "APPLY_X6WIO_CORRECTION_80_REAL";
  const target_session_id = "S20260707-x6wio";
  const target_session_anchor = "EMPV3-20260707-abdul-x6wio";
  const readJson = async (url, options = {}) => {
    const res = await fetch(url, { credentials: "include", ...options });
    const raw = await res.text();
    const json = JSON.parse(raw);
    return { url, status: res.status, json, raw };
  };

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

  const previewRequest = {
    target_session_id,
    target_session_anchor,
    correction_type: "duplicate_upload_correction",
    correction_reason: "Void duplicate rent rows in x6wio while keeping the real 80 AED arrears payment.",
    evidence_summary: "Original w1ofc already contains #334 rent 700 and #134 rent 770. x6wio should keep only #334 arrears_payment 80.",
    correction_events
  };

  const wrongTarget = await readJson("/api/owner/corrections/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...previewRequest, target_session_id: "S20260707-wrong", preview_hash: "DUMMY-H3B4-WRONG-TARGET", idempotency_key: "DUMMY-H3B4-WRONG-TARGET" })
  });

  const wrongEvent = await readJson("/api/owner/corrections/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...previewRequest, correction_events: [{ ...correction_events[0], original_event_id: "wrong-event" }], preview_hash: "DUMMY-H3B4-WRONG-EVENT", idempotency_key: "DUMMY-H3B4-WRONG-EVENT" })
  });

  const preview = await readJson("/api/owner/corrections/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(previewRequest)
  });

  const preview_hash = preview.json.preview_hash || "";
  const exactPayload = {
    ...previewRequest,
    preview_hash,
    idempotency_key: `x6wio-duplicate-rent-correction-S20260707-x6wio-${Date.now()}`,
    explicit_owner_confirmation: {
      confirmed: true,
      understands_original_events_immutable: true,
      understands_no_hard_delete: true,
      understands_correction_is_additive: true,
      confirmed_target_session_anchor,
      confirmed_target_session_id: target_session_id,
      confirmed_correction_gross_delta: -1470,
      confirmed_adjusted_gross: 80,
      confirmed_correction_cash_delta: -1470,
      confirmed_adjusted_cash: 80,
      confirmed_80_aed_arrears_payment_was_real: true
    }
  };

  const wrongTotalPayload = {
    ...exactPayload,
    explicit_owner_confirmation: {
      ...exactPayload.explicit_owner_confirmation,
      confirmed_adjusted_gross: 1550
    },
    idempotency_key: "DUMMY-H3B4-WRONG-TOTAL"
  };

  const wrongTotal = await readJson("/api/owner/corrections/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(wrongTotalPayload)
  });

  console.log("H3B4 SCRIPT B PRE-APPLY REJECTION RESULT", {
    wrong_target_rejected: wrongTarget.json.ok === false,
    wrong_event_rejected: wrongEvent.json.ok === false,
    wrong_total_rejected: wrongTotal.json.ok === false,
    preview_status: preview.status,
    preview_gross_delta: preview.json.correction_totals?.gross_delta,
    preview_adjusted_gross: preview.json.adjusted_totals?.gross,
    exact_payload_prepared: preview_hash.length > 0,
    exact_payload_submitted: false,
    production_write: "no"
  });

  console.log("H3B4 EXACT X6WIO PAYLOAD PREPARED. DO NOT SUBMIT UNLESS H3B5 IS APPROVED.", exactPayload);
  const typed = window.prompt(`H3B4 safety stop. Type ${REQUIRED_TYPED_CONFIRMATION} only in approved H3B5 execution. Anything else cancels.`);
  if (typed !== REQUIRED_TYPED_CONFIRMATION) {
    console.log("H3B4 EXACT APPLY NOT SUBMITTED", { exact_payload_submitted: false });
    return;
  }
  console.log("H3B4 does not submit apply. Run the approved H3B5 execution script instead.");
})();
```

### Script C: After Disabling

Confirms apply is disabled again and no further correction write is possible.

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
    evidence_summary: "H3B4 after-disable disabled gate check.",
    correction_events: [],
    preview_hash: "DUMMY-H3B4-AFTER-DISABLE",
    idempotency_key: "DUMMY-H3B4-AFTER-DISABLE"
  };

  const disabled = await readJson("/api/owner/corrections/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(disabledPayload)
  });

  const detail = await readJson(`/api/session_detail?id=${encodeURIComponent(target_session_id)}&include_corrections=1`);

  console.log("H3B4 SCRIPT C AFTER DISABLE RESULT", {
    apply_status: disabled.status,
    apply_disabled: disabled.json.error_code === "OWNER_CORRECTION_APPLY_DISABLED",
    no_write: disabled.json.no_write === true,
    detail_status: detail.status,
    correction_summary_exists: Boolean(detail.json.correction_summary),
    production_write: "no"
  });
})();
```

## 9. Final Apply Dependency

H3B4 only prepares the temporary gate enable package.

Actual correction apply must happen in a separate explicitly approved step:

`H3B5_ONE_TIME_X6WIO_APPLY_EXECUTION`

Do not apply x6wio correction in H3B4.

## 10. No-Go Conditions

Do not proceed if:

- real implemented config names cannot be identified
- target-scoped gate cannot be enabled separately from broad global apply
- broad global apply alone could permit writes
- enable requires migration
- enable requires code change not reviewed
- apply endpoint cannot be disabled immediately after
- H4B detail endpoint fails
- H2 preview totals changed
- owner confirmation missing
- 80 AED real-payment confirmation missing
- production backup/export not captured
- exact original_event_id allowlist changes
- `ent20260707-x6wio-01` is included in the void allowlist
- config propagation mechanism is unknown
- current worker version cannot be captured

## 11. Backup / Export Checklist

Before future enable/apply, capture:

- legacy session_detail for `S20260707-x6wio`
- `include_corrections=1` detail for `S20260707-x6wio`
- H2 preview response
- apply disabled response
- current worker version
- current git commit
- current env/config state without sensitive values
- current `/api/history` list visibility for x6wio
- current owner-visible x6wio totals

## 12. Security Requirements

- do not print secrets
- do not print tokens/cookies/passwords
- do not store sensitive env values in docs
- commands with sensitive values must use placeholders
- only safe public target values may appear
- do not paste authenticated headers into documents
- do not save browser session artifacts containing credentials

Recommended next step:

`READY_FOR_H3B5_ONE_TIME_X6WIO_APPLY_EXECUTION`

Alternative:

`DO_NOT_PROCEED`

production_cutover = `PRODUCTION_NO_GO`

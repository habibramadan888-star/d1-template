# P0 Upload / Deposit Out / Checkout Audit

Date: 2026-07-06
Branch: fix/auth-closure-001
Mode: read-only audit

## Scope

This audit checks three current employee Entry issues without changing code, deploying, running migrations, or writing production data:

1. Upload Session still fails.
2. Deposit Out difference reason is not clearly enforced.
3. Left With Arrears fields are missing from the visible flow.

Production write: no
Migration: no
Deploy: no
Production cutover: PRODUCTION_NO_GO

## Verification Run

| Command | Result |
|---|---|
| npm run security:secrets | PASS |
| npm run gate:commercial-launch | PASS, COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO |

## Upload Session Failure Trace

Important constraint: `/api/employee/entry` has no read-only validation or dry-run endpoint. The only live endpoint is `POST /api/employee/entry`, and the handler writes `sessions`, `transactions`, audit/event rows, and may update arrear/deposit task state after validation. Under this task's no-production-write rule, I did not trigger a live upload POST.

Chrome authenticated page-state inspection was also unavailable in this environment because the browser native bridge was rejected as untrusted. I therefore could not read the current in-browser draft payload or the existing console/network response without interacting with protected browser session storage.

| Layer | Result | Error |
|---|---|---|
| Current Session anchors | Not available from live page under current read-only constraints. Static path: `prepareRepeatableUploadRows()` clones drafts, assigns new `session_id`, `event_id`, `idempotency_key`, then calls `normalizeEntryAnchor()`. | Current browser state could not be read safely; no code-level failure found before validation. |
| Upload payload | Static path: `commitSessionAndExport()` builds `canonicalEntries`, `session.entries`, `session.entries_json`, `summary`, and sends one POST per entry with the full session payload. | Payload can fail before API if `validateUploadAnchorBatch()` sees `validation_status !== valid`. |
| POST /api/employee/entry | Static path: frontend calls `apiFetch('/api/employee/entry', { method:'POST', body: JSON.stringify({ entry:e, session:sessionForEntry }) })`. | No dry-run route exists to retrieve live response without writing. |
| Backend validation | `handleEmployeeEntry()` validates by event type before D1 write. Known rejection codes include `linked_task_required`, `linked_task_not_open`, `arrear_payment_amount_invalid`, `deposit_refund_difference_reason_required`, `deposit_refund_open_arrears_owner_approval_required`, `checkout_open_arrears_owner_approval_required`, `deposit_deduction_exceeds_balance`, and rent-period errors. | Exact current failure cannot be proven without the real response body or a non-writing validation endpoint. |
| D1 write path | If validation passes, handler inserts/updates `sessions`, `transactions`, arrear tasks, deposit ledger, entry events, and audit logs. | Not executed during this audit. |
| Response body | Not captured. | No safe read-only method available for the real current POST response. |

### Upload Root Cause Classification

`UNKNOWN`

Reason: the exact current upload error is not recoverable without either a safe in-browser read of the already captured network response or a non-writing validation endpoint. Static code shows several likely backend rejection points, but assigning one as the root cause would be guesswork.

### Upload Risk Notes

| Candidate | Evidence | Why It Matters |
|---|---|---|
| FRONTEND_ANCHOR_INVALID | `validateUploadAnchorBatch()` rejects any row whose normalized anchor has missing required fields. | This prevents the POST entirely, but the current browser draft was not readable. |
| BACKEND_VALIDATION_REJECTED | `handleEmployeeEntry()` has hard backend rejects before any D1 write. | This matches "Add to Session succeeds, Upload fails" when frontend allows a row but backend rejects it. |
| PROJECTION_ARREARS_REF_REJECTED | Backend AP flow calls `empEnsureOpenArrearTaskForPayment()` and returns `linked_task_not_open` if the ref is not accepted as open. | Current code includes projection lookup support, so this is possible only if the selected ref/status/bed differs from the expected projection. |
| UPLOAD_PAYLOAD_MISSING_FIELD | Backend requires different fields for Rent, AP, DR, CO, TF. | Deposit Out / Left With Arrears field gaps could surface only at upload time. |

## Deposit Out Difference Reason Audit

Business rule:

```js
if (actual_refund_amount !== deposit_balance) {
  difference_reason required
}
```

### Current Code Path

| Layer | Current Behavior | Finding |
|---|---|---|
| UI fields | `depositOutFields` contains `Deposit Balance`, `Refund Date`, and `Difference Reason`. | Field exists. |
| Frontend value mapping | `entryPayload()` maps `amount` to `actual_refund_amount` / `refund_amount`, uses `depositHeld()` as `deposit_balance`, and maps `depositOutDifferenceReason` to `difference_reason` / `refund_reason`. | Mapping exists. |
| Frontend validation | `validate()` computes `diff = amt - depositHeld()` and requires `depositOutDifferenceReason` if `abs(diff) > 0.01`. | Validation exists. |
| Backend validation | `handleEmployeeEntry()` computes `diff = amount - depositBalance` and returns `deposit_refund_difference_reason_required` if reason is missing. | Backend validation exists. |
| Deposit balance source | Frontend and backend depend on system-read deposit context: `depositHeld()` / tenant card deposit balance. If deposit context is unavailable or stale, the user sees "Needs Review" or a different blocking error. | This is the weak point in the user-visible flow. |

### Deposit Out Root Cause Classification

`UNKNOWN`

Reason: current static code has both frontend and backend difference-reason checks connected. The reported behavior could be caused by live stale assets, unavailable deposit balance context, or another earlier validation block masking the difference-reason error. A live page-state trace is required to classify beyond `UNKNOWN`.

### Deposit Out Specific Gap

The user-facing issue is still plausible because the field is attached to a generic amount flow. If `depositHeld()` is not loaded, the system cannot clearly compare "system deposit balance" against "actual refund amount", and the UI may show a generic amount/deposit-context block rather than the required "Difference Reason" block.

## Left With Arrears Field Audit

Required employee fields:

- Rent/Coverage End Date
- Confirmed Not Returning Date
- Belongings Held
- Belongings Note if held
- Promised Payment Date
- Left Arrears Amount
- WhatsApp Phone
- Note

System-read fields:

- former customer/card name
- check-in date
- deposit balance
- existing cloud arrears amount
- cloud_arrears_ref
- overdue days if calculable

### Current Code Path

| Area | Current Behavior | Finding |
|---|---|---|
| Renderer | Left With Arrears is nested inside the generic Checkout section as `leftWithArrearsFields`, hidden by default. | The flow still depends on the normal checkout renderer. |
| Mode switch | `leftWithArrearsSelected()` requires `entryType === CO` and `leftWithArrearsMode === left_with_arrears`. | Fields only render after the checkout mode is changed. |
| Visible fields when active | Active panel includes WhatsApp Phone, Confirmed Not Returning Date, Promised Payment Date, Belongings Held, Note, Belongings Note, and a system-read summary. | Most required fields exist in code but are hidden until mode selection. |
| Missing/weak fields | Rent/Coverage End Date and Left Arrears Amount are system summary values, not explicit employee fields. Left Arrears Amount is inferred from open arrears rows. | Business-required field visibility is not direct enough. |
| Validation | Left mode validation requires open cloud arrears, WhatsApp phone, promised payment date, confirmed not returning date, and belongings note when held. | Validation exists only after left mode is active. |
| Backend metadata | `empLeftWithArrearsMetaFromEntry()` supports phone, belongings, promised dates, deposit balance, cloud arrears ref, and status metadata. | Storage metadata exists. |

### Left With Arrears Root Cause Classification

`LEFT_WITH_ARREARS_REUSES_NORMAL_CHECKOUT`

Reason: the specialized fields are present in code, but the UI is still layered inside the normal Checkout renderer and hidden unless the user switches the Checkout Type. This explains the visible symptom where the user sees only normal Checkout fields such as Checkout Date and Note.

## Root Cause Summary

| Problem | Root Cause |
|---|---|
| Upload Session fails | UNKNOWN |
| Deposit Out difference reason not effective | UNKNOWN |
| Left With Arrears fields missing | LEFT_WITH_ARREARS_REUSES_NORMAL_CHECKOUT |

## Recommended Smallest Fix Order

1. Add a non-writing upload validation endpoint or dry-run mode for `/api/employee/entry` that runs the same frontend/backend validation and returns the exact per-entry error without inserting sessions, transactions, audit logs, deposit ledger rows, or arrear task updates.
2. Add upload error passthrough in the employee UI so the first failing entry shows `event_type`, `event_id`, and backend error code such as `linked_task_not_open` or `deposit_refund_difference_reason_required`.
3. Re-test the current failing Upload Session using the dry-run validator, then fix the proven failing anchor path only.
4. Make Deposit Out display a dedicated comparison block: `Deposit Balance`, `Actual Refund Amount`, `Difference`, `Difference Reason`. If Deposit Balance is unavailable, show `Deposit Balance: Needs Review` and block with that exact reason.
5. Move Left With Arrears into a dedicated Checkout sub-flow instead of hiding it inside the normal Checkout fields. When selected, show the required fields immediately and hide normal checkout deduction fields.
6. Keep production cutover as `PRODUCTION_NO_GO`; do not deploy until a live authenticated validation trace identifies the upload failure code.

## Evidence Pointers

| File | Evidence |
|---|---|
| `deploy-worker/public/employee-v3.html` | `commitSessionAndExport()` builds upload payload and posts to `/api/employee/entry`. |
| `deploy-worker/public/employee-v3.html` | `validateUploadAnchorBatch()` rejects normalized anchors before API call. |
| `deploy-worker/public/employee-v3.html` | `depositOutFields`, `depositOutDifferenceReason`, and frontend difference validation exist. |
| `deploy-worker/public/employee-v3.html` | `leftWithArrearsFields` exists but is hidden until `leftWithArrearsMode` is selected. |
| `deploy-worker/src/index.js` | `handleEmployeeEntry()` is the live upload handler and writes after validation. |
| `deploy-worker/src/index.js` | Backend rejects Deposit Out mismatch without reason using `deposit_refund_difference_reason_required`. |
| `deploy-worker/src/index.js` | Backend rejects Deposit Out / Checkout with open arrears unless owner approval / left-with-arrears mode applies. |

## Final Status

Production write = no
Migration = no
Deploy = no
Production cutover = PRODUCTION_NO_GO

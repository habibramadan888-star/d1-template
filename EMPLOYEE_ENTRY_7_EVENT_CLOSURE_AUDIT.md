# Employee Entry 7 Event Closure Audit

Date: 2026-07-05
Branch: fix/auth-closure-001
Commit audited: b2be906
Mode: read-only audit; no code change, no deploy, no production write.

## Scope

Audited the employee Entry path for:

1. Rent / 收租
2. Arrears Payment / 还欠款
3. Deposit In / 收押金
4. Deposit Out / 退押金
5. Checkout / 退房
6. Expense / 支出
7. Bed Transfer / 换床

Closure path checked:

Employee Entry UI -> Current Session -> Upload -> Cloud Session -> Owner History -> Owner Detail -> WhatsApp -> Customer Credit / Historical Arrears / Rent Continuity.

## Sources Reviewed

| Area | File / Function |
|---|---|
| Anchor contract | `ENTRY_ANCHOR_CONTRACT.md` |
| Employee anchor contract | `deploy-worker/public/employee-v3.html`, `EMPLOYEE_ENTRY_ANCHOR_CONTRACT` |
| Employee anchor normalize | `deploy-worker/public/employee-v3.html`, `applyEntryAnchors()`, `normalizeEntryAnchor()` |
| Employee current session | `deploy-worker/public/employee-v3.html`, `currentSessionPayload()`, `sessionStats()` |
| Employee upload | `deploy-worker/public/employee-v3.html`, `commitSessionAndExport()` |
| Employee WhatsApp | `deploy-worker/public/employee-v3.html`, `entryWhatsappLine()`, `buildEntrySessionWhatsAppText()` |
| Worker upload API | `deploy-worker/src/index.js`, `handleEmployeeEntry()` |
| Worker owner detail decoder | `deploy-worker/src/index.js`, `parseEmployeeEntryExportRows()`, `/api/session_detail` |
| Owner history UI | `deploy-worker/public/index-51-main.js`, `renderHistory()`, `normalizeLedgerSession()` |
| Client credit / debt | `deploy-worker/public/index-51-main.js`, `ccBuildHistoricalArrearsLedger()` |
| Rent continuity | `deploy-worker/public/index-51-main.js`, `rc_allLedgerSessions()`, `rc_buildBedPaymentContinuityIndex()` |

## Architecture Finding

The contract exists, but the current production path is not yet a true structured anchor SOT.

`currentSessionPayload()` includes `entries: state.drafts`, but `handleEmployeeEntry()` only writes legacy `sessions` columns plus one `transactions` row per request. There is no persisted `entries_json` or structured `summary` column in the active `sessions` write. Owner detail for employee sessions falls back to parsing `export_text`, and that parser only reconstructs part of the contract.

Most serious behavior:

- `/api/session_detail` returns `parseEmployeeEntryExportRows(sessionRow)` if it finds any export rows.
- `parseEmployeeEntryExportRows()` currently parses only:
  - `CASH RECEIVED` + `R`
  - `CASH RECEIVED` + `TF`
  - `ARREAR REPAID` + `AP`
- It does not parse:
  - `BANK RECEIVED`
  - `DEPOSIT RETURN`
  - `CHECKOUT`
  - `EXPENSE`
  - `TRANSFER` section
  - waived / zero AED bed transfers
  - deposit in rows as structured `deposit_in`

So mixed sessions can show partial owner detail even when transaction rows exist.

## 7 Event Closure Summary

| Event | Entry UI | Anchor | Upload Payload | Cloud Session | Owner History | Owner Detail | WhatsApp | Downstream Use | Bugs |
|---|---|---|---|---|---|---|---|---|---|
| Rent | Present; validates period and short-paid fields | Mostly complete; `short_paid`, `arrears_amount`, `arrears_due_date`, `arrears_note` generated | Per-row upload includes fields | Session stores summary/export text; no `entries_json`; transaction stores legacy fields | List can show session total from stored summary | Cash rent can decode from export text; bank rent may fall back to transaction rows only if no parsed export rows override | Preserves expected/short_paid/due/note | Historical arrears can read deficit/text if entry appears in loaded sessions | `UPLOAD_PAYLOAD_LOSS`, `OWNER_DECODER_MISSING`, `DOWNSTREAM_NOT_READING_ANCHOR` |
| Arrears Payment | Present; requires linked task | Anchor generated with `arrears_ref`, original/already/payment/remaining | Payload includes values | Transaction schema does not persist original/already/remaining as first-class fields; task reconciliation happens separately | Session visible | Export parser extracts AP amount/ref but reconstructs original as amount and already as 0; remaining becomes 0, losing true partial context | WhatsApp preserves original/already/remaining from local anchor | Historical arrears repayment logic depends on loaded entries/text, not contract anchor | `ARREARS_REF_MISSING`, `UPLOAD_PAYLOAD_LOSS`, `OWNER_DECODER_MISSING`, `DOWNSTREAM_NOT_READING_ANCHOR` |
| Deposit In | Present | Anchor generated with deposit amount, bed, payment method, linked tenant, note | Payload includes legacy deposit fields | `deposit_ledger` is updated; session lacks structured anchor JSON | Session visible via totals | Not parsed from employee export text; can be omitted from mixed-session detail when parser returns partial export rows | Generic line loses linked tenant/deposit-specific fields | Client credit depends on normalized loaded entries/deposit ledger, not guaranteed anchor | `OWNER_DECODER_MISSING`, `WHATSAPP_EXPORT_LOSS`, `DOWNSTREAM_NOT_READING_ANCHOR` |
| Deposit Out | Present | Anchor generated with refund amount, refund reason, checkout ref, note | Payload includes legacy refund/deduction fields | `deposit_ledger` updated for DR; session lacks structured anchor JSON | Session visible via totals | `DEPOSIT RETURN` section not parsed; owner mapping of transaction rows does not preserve full refund reason/checkout ref | Generic line loses refund reason/checkout ref detail | Downstream only works if transaction rows are loaded and normalized; no contract reader | `OWNER_DECODER_MISSING`, `WHATSAPP_EXPORT_LOSS`, `DOWNSTREAM_NOT_READING_ANCHOR` |
| Checkout | Present | Anchor generated with checkout date, deposit refund, outstanding arrears, final note | Payload includes checkout/deposit deduction fields | Transaction row persists some checkout/deposit fields; no structured session anchor | Session visible via totals | `CHECKOUT` section not parsed; owner detail row mapping omits several checkout-specific fields | Generic WhatsApp line loses deposit refund/outstanding/final note/card status | Occupancy/client evidence not reading a unified checkout anchor | `OWNER_DECODER_MISSING`, `WHATSAPP_EXPORT_LOSS`, `DOWNSTREAM_NOT_READING_ANCHOR` |
| Expense | Present | Anchor generated with amount, category, target bed, reason, note | Payload includes `expense_category`/`expense_desc` | Transaction row persists expense fields; no structured session anchor | Session visible via totals | `EXPENSE` section not parsed; owner detail mapping does not preserve `expense_category` robustly | Generic line may include expense desc, but no full category/reason contract | Analysis totals can count expense if row exists; credit/continuity do not need expense | `OWNER_DECODER_MISSING`, `WHATSAPP_EXPORT_LOSS` |
| Bed Transfer | Present but saved by dedicated `/api/employee/bed-transfers`, not normal session upload | Anchor generated for local/session entry; fee and old context present in UI object | Unsynced TF blocks session upload; synced TF may be included in export text but not uploaded as transaction row | Dedicated `entry_events` + `bed_transfer_events`; not unified into sessions as `entries_json` | History may show session only if another uploaded entry creates session | Parser only decodes charged TF in `CASH RECEIVED`; ignores `TRANSFER` section and waived/0 AED TF | WhatsApp supports `#from->#to` and waived text | Overview has bed transfer fee/review paths; rent continuity/client credit do not use a unified session anchor | `BED_TRANSFER_CONTEXT_LOSS`, `OWNER_DECODER_MISSING`, `EMPLOYEE_OWNER_CONTRACT_MISMATCH`, `DOWNSTREAM_NOT_READING_ANCHOR` |

## Critical Bugs

Critical bugs count: 7

| ID | Event | Bug Type | Evidence | Impact |
|---|---|---|---|---|
| BUG-01 | All | `UPLOAD_PAYLOAD_LOSS` | `currentSessionPayload()` sends `entries`, but `handleEmployeeEntry()` does not persist `entries_json` or structured session summary. | Anchor contract is not the cloud SOT; owner/downstream must infer from legacy rows/text. |
| BUG-02 | All mixed sessions | `SESSION_DETAIL_EMPTY` / `OWNER_DECODER_MISSING` | `/api/session_detail` returns export-decoded rows if `parseEmployeeEntryExportRows()` finds any rows. Decoder only parses R/AP/TF subset. | Mixed sessions can show partial details and drop deposit/checkout/expense/bank rows. |
| BUG-03 | Rent | `OWNER_DECODER_MISSING` | Export decoder parses rent only under `CASH RECEIVED`; bank rent is not decoded. | Bank-paid rent can be missing from owner detail when any export-decoded row exists. |
| BUG-04 | Arrears Payment | `ARREARS_REF_MISSING` / `UPLOAD_PAYLOAD_LOSS` | Transaction schema stores `linked_task_id`, but owner transaction mapping reconstructs original/already/remaining from `period_due` and amount; export parser loses true original/already/remaining. | Partial repayment evidence can be wrong or appear settled incorrectly. |
| BUG-05 | Deposit / Checkout / Expense | `OWNER_DECODER_MISSING` | Export parser does not parse `DEPOSIT RETURN`, `CHECKOUT`, `EXPENSE`, or structured deposit in rows. | Owner detail and downstream evidence can omit these events. |
| BUG-06 | Bed Transfer | `EMPLOYEE_OWNER_CONTRACT_MISMATCH` | Bed Transfer uses `/api/employee/bed-transfers`; normal session upload blocks unsynced TF and does not persist TF as a transaction row. Export parser ignores `TRANSFER` and waived TF. | Owner history/session detail cannot reliably show bed transfer anchors in the same session. |
| BUG-07 | Downstream | `DOWNSTREAM_NOT_READING_ANCHOR` | Client credit and rent continuity read `state.saved` / `analysisSessions` entries and text-derived signals, not a canonical structured anchor store. | Even if UI upload has anchors, downstream correctness depends on whether owner history/detail reconstructed them. |

## Per-Event Bug List

### 1. Rent / 收租

Found:

- UI generates short-paid fields in `applyEntryAnchors()`.
- Backend creates/updates `arrear_tasks` when rent shortfall is present.
- WhatsApp export includes `expected`, `short_paid`, `due`, and note.

Bugs:

- `entries_json` is not persisted in `sessions`.
- Owner detail export decoder only parses cash rent lines, not bank rent lines.
- Downstream historical arrears still relies on normalized loaded entries/text signals rather than directly reading `short_paid` anchors from structured session JSON.

Minimum fix:

- Persist `entries_json` with normalized anchors.
- Make owner detail prefer structured anchors, then transaction rows, then export-text parser.
- Extend detail decoder to handle `BANK RECEIVED` rent as fallback.

### 2. Arrears Payment / 还欠款

Found:

- UI flow does not bind AP to billing period and requires a linked task.
- Backend requires `linked_task_id` and reconciles the arrear task.
- WhatsApp line includes ref/original/already/remaining/status from local anchor.

Bugs:

- Cloud transaction row does not preserve original/already/remaining as first-class structured anchor fields.
- Export parser AP reconstructs only amount/ref and loses true original/already/remaining.
- Owner detail transaction mapping can show misleading remaining values.

Minimum fix:

- Persist AP anchor JSON fields in `entries_json`.
- Owner detail should render AP from structured anchor.
- Keep transaction row as accounting evidence only, not as the AP contract authority.

### 3. Deposit In / 收押金

Found:

- UI anchor includes deposit amount, linked tenant, note.
- Backend writes `deposit_ledger` movement.

Bugs:

- No structured session anchor persistence.
- Owner detail export parser does not decode deposit-in rows.
- WhatsApp generic line does not guarantee linked tenant / deposit-specific evidence.

Minimum fix:

- Persist deposit_in anchor in `entries_json`.
- Owner detail render deposit_in from structured anchor.
- WhatsApp should use `renderEntryAnchorForWhatsapp()` with deposit-specific fields.

### 4. Deposit Out / 退押金

Found:

- UI anchor includes refund amount, refund reason, checkout ref, note.
- Backend writes deposit ledger movement.

Bugs:

- `DEPOSIT RETURN` export section not decoded by owner detail.
- Transaction-row mapping loses some refund reason / checkout reference semantics.
- WhatsApp generic line can lose refund reason and checkout ref.

Minimum fix:

- Persist deposit_out anchor in `entries_json`.
- Add deposit_out renderer for owner detail and WhatsApp.

### 5. Checkout / 退房

Found:

- UI has checkout fields and anchor normalization.
- Backend validates deposit deduction and writes transaction evidence.

Bugs:

- Owner detail export parser ignores `CHECKOUT`.
- Owner frontend transaction mapping does not fully preserve checkout-specific fields.
- WhatsApp generic line loses checkout date, deposit refund, outstanding arrears, final note, card status.

Minimum fix:

- Persist checkout anchor in `entries_json`.
- Render checkout-specific owner detail and WhatsApp line from contract fields.

### 6. Expense / 支出

Found:

- UI captures amount, category, description.
- Backend persists expense category/description in transaction row.

Bugs:

- Owner detail export parser ignores `EXPENSE`.
- Owner frontend transaction mapping does not reliably preserve expense category.
- WhatsApp generic line is acceptable for quick handover, but not complete as an anchor export.

Minimum fix:

- Persist expense anchor in `entries_json`.
- Render expense-specific owner detail row.

### 7. Bed Transfer / 换床

Found:

- Dedicated backend path writes `entry_events` and `bed_transfer_events`.
- Local session entry can carry from/to/fee/waiver/reason context.
- WhatsApp supports `#from->#to`.

Bugs:

- Bed Transfer is not unified with `/api/employee/entry` session upload.
- Unsynced TF blocks session upload.
- If TF is already synced, it can appear in export text, but no corresponding transaction row exists in that session.
- Owner export decoder parses charged TF only from `CASH RECEIVED`; it ignores `TRANSFER` and waived 0 AED transfers.
- Contract says Bed Transfer is one of the 7 Entry events, but implementation is split across session draft, `entry_events`, and `bed_transfer_events`.

Minimum fix:

- Persist bed_transfer anchor in session `entries_json` when it is part of the Current Session.
- Owner detail should merge session structured anchors with dedicated bed transfer event anchors by `entry_event_id` / session anchor.
- Decode waived/0 AED bed transfers from structured anchors, not export text.

## Highest-Risk Broken Path

Highest-risk broken: `OWNER_DECODER_MISSING` + `EMPLOYEE_OWNER_CONTRACT_MISMATCH`.

The employee UI can create rich anchors, but the cloud session does not store them as structured `entries_json`. Owner detail then falls back to a narrow export-text parser that returns partial rows and can hide valid transaction rows in mixed sessions. This breaks owner visibility and downstream evidence for customer credit, historical arrears, and rent continuity.

## Recommended Minimal Fix Plan

1. Add non-migration-compatible structured persistence if an existing text column can hold JSON; otherwise stop and request migration approval for `sessions.entries_json` and `sessions.summary_json`.
2. Change employee upload to submit the whole session once, or update final session row with complete normalized anchors after all per-row writes succeed.
3. Make `/api/session_detail` read order:
   - structured `entries_json`
   - active transaction rows normalized to anchors
   - export-text parser fallback only when structured/transaction rows are unavailable
4. Extend owner detail rendering to all 7 event types using `renderEntryAnchorForOwner()`.
5. Make WhatsApp export call event-specific renderers for all 7 types, not generic fallback for deposit/checkout/expense.
6. Update client credit / historical arrears / rent continuity to read normalized anchors from loaded sessions, with text parsing only as legacy fallback.
7. Add contract tests for mixed sessions containing all 7 event types.

## Verification Run

Executed read-only verification:

| Command | Result | Notes |
|---|---|---|
| `npm run security:secrets` | PASS | No secret leak detected by repo check. |
| `npm run gate:commercial-launch` | PASS | `COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO`. |
| `node --test tests/employee-entry-anchor-contract.spec.mjs tests/employee-entry-arrears-payment-flow.spec.mjs tests/employee-entry-whatsapp-export-baseline.spec.mjs tests/employee-session-contract.spec.mjs tests/owner-history-employee-entry-decoder.spec.mjs tests/owner-history-read-employee-anchors.spec.mjs tests/owner-client-credit-receivables-debt-details.spec.mjs tests/owner-rent-continuity-payment-timeline.spec.mjs` | PARTIAL | 25 passed, 2 failed. The failures are stale vendor-label text expectations (`TTLock` text hidden by prior UI vendor-label work), not production writes and not caused by this audit. |

## Safety

| Item | Status |
|---|---|
| Code modified | No |
| Deploy | No |
| Production write | No |
| Migration | No |
| Parser changed | No |
| Financial formula changed | No |
| Production cutover | PRODUCTION_NO_GO |

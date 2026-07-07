# Employee Entry 7 Template Mindmap Audit

Task: read-only audit of the employee Entry 7 independent event templates.

Date: 2026-07-07
Branch: fix/auth-closure-001
Scope: Entry UI template registry, anchor contract, upload validation, owner history/detail decoding, WhatsApp rendering, and downstream usability.

## 0. Read-Only Boundaries

- Code changes: no
- Deployment: no
- Production write: no
- Migration: no
- Parser changes: no
- Financial formula changes: no
- Production cutover: PRODUCTION_NO_GO

## 1. Sources Reviewed

| Source | Purpose |
|---|---|
| `ENTRY_ANCHOR_CONTRACT.md` | Canonical 7 event anchor contract and required fields. |
| `EMPLOYEE_ENTRY_EVENT_TEMPLATE_PLAN.md` | Target architecture: 7 event-specific templates instead of one generic template. |
| `deploy-worker/public/employee-v3.html` | Employee Entry template registry, DOM mounting, validators, anchor builders, WhatsApp rendering. |
| `deploy-worker/src/index.js` | Upload dry-run, real upload, session storage, owner history/detail decoder, backend validation. |
| `tests/employee-entry-anchor-contract.spec.mjs` | Existing anchor contract fixture coverage. |
| `tests/employee-entry-template-registry.spec.mjs` | Test file exists, but no npm script is registered for it. |

## 2. Overall Mindmap

```text
Employee Entry
|-- UI event selector
|   |-- rent
|   |-- arrears_payment
|   |-- deposit_in
|   |-- deposit_out
|   |-- checkout
|   |-- expense
|   `-- bed_transfer
|
|-- Template registry
|   |-- fields / required_fields / system_read_fields / forbidden_fields
|   |-- DOM parking and remount by selected event
|   `-- issue: registry exists, but validators/builders still call shared generic functions
|
|-- Current Session
|   |-- canonical anchor normalization
|   |-- dry-run validation before cloud write
|   |-- real upload only after dry-run pass
|   `-- sessions.entries_json + export_text anchor block
|
|-- Cloud / owner side
|   |-- sessions summary
|   |-- structured entries_json
|   |-- owner history employee_entry decoder
|   `-- owner session_detail anchor extraction
|
|-- Output consumers
|   |-- WhatsApp statement render
|   |-- owner history/detail
|   |-- cloud arrears projection
|   |-- client credit / arrears / continuity future consumers
|   `-- risk: downstream algorithms are not all proven to consume only canonical anchors
```

## 3. Architecture Judgment

The latest implementation has an actual `entryTemplates` / `employeeEntryTemplates` registry and mounts event-specific field groups into the active Entry form. That fixes the visible "one form shows everything" problem at the UI layout level.

However, the implementation is not yet a fully independent 7-template business architecture. The event validators are currently thin wrappers around the shared `validate()` function, and the event anchor builders are thin wrappers around shared `entryPayload()` plus `applyEntryAnchors()`. This means the templates are separated in the registry and DOM, but not fully separated in validation and anchor construction.

Current closure level: PARTIAL.

Primary risk: cross-event behavior can still leak through shared validation/build paths, especially checkout, deposit_out, and arrears_payment.

## 4. Overall Field Matrix

| Event | Required Employee Inputs | System Read Fields | Required Anchor Fields | Downstream Consumers | Closure |
|---|---|---|---|---|---|
| rent | bed, paid amount, payment method, rent period start/end, short-paid due/reason when short, note | monthly rent, open arrears alert, deposit context, card/customer context | bed, expected_rent, paid_amount, payment_method, rent_period_start/end, short_paid, arrears_amount, arrears_due_date, arrears_note, arrears_status | owner history/detail, WhatsApp, Cloud Arrears, client credit, rent continuity | PARTIAL |
| arrears_payment | bed, selected arrears_ref, payment amount, payment method, note | Cloud Arrears projection/open items, original amount, already paid, remaining before | bed, arrears_ref, original_arrears_amount, already_paid_amount, payment_amount, remaining_arrears, settlement_status | owner history/detail, WhatsApp, Cloud Arrears settlement, client credit | PARTIAL |
| deposit_in | bed, deposit amount, payment method, note | customer/card context, existing deposit context | bed, deposit_amount, payment_method, linked_tenant/bed, note | owner history/detail, WhatsApp, future deposit balance | PARTIAL |
| deposit_out | bed, refund amount, refund method/date, refund reason, difference reason if mismatch, note | deposit balance, open arrears check | bed, refund_amount, payment_method, refund_reason, checkout_ref, note, deposit_balance, difference_reason | owner history/detail, WhatsApp, deposit ledger, checkout guard | PARTIAL |
| checkout | bed, checkout date, checkout type, deposit refund, belongings fields for left-with-arrears, note | deposit balance, open arrears, card/customer context, cloud_arrears_ref | bed, checkout_date, deposit_refund, outstanding_arrears, owner_approval_required/status, checkout_mode, final_note, left-with-arrears fields | owner history/detail, WhatsApp, Cloud Arrears, future customer isolation | PARTIAL |
| expense | amount, category, payment method, target bed/room, reason/note | optional bed/room context | expense_amount, expense_category, target_bed/room, reason, payment_method, note | owner history/detail, WhatsApp, finance totals | PARTIAL |
| bed_transfer | from_bed, to_bed, transfer date, fee option, transfer reason, waiver reason if waived, note | old tenant/card context, open arrears warning | from_bed, to_bed, transfer_date, fee_amount, fee_status, waiver_reason, transfer_reason, old_tenant_context, old_ttlock_context, note | owner history/detail, WhatsApp, transfer fee accounting | PARTIAL |

## 5. Template Mindmaps

### 5.1 Rent

```text
Rent
|-- Business Purpose
|   `-- Record normal rent collection and short-paid rent.
|-- Employee Flow
|   `-- Select Rent -> bed -> arrears alert -> payment method -> amount -> period -> add to session -> dry-run -> upload.
|-- Employee Inputs
|   `-- bed, paid_amount, payment_method, rent_period_start, rent_period_end, short_paid due/reason if needed, note.
|-- System Read Fields
|   `-- expected rent, customer/card context, open arrears, deposit context.
|-- Validation
|   |-- Frontend registry exists.
|   |-- Backend validates expected rent, period dates, and short-paid due/reason.
|   `-- Gap: frontend `validateRentEntry()` still calls shared `validate()`.
|-- Anchor Fields
|   `-- expected_rent, paid_amount, short_paid, arrears_amount, arrears_due_date, arrears_note, arrears_status.
|-- Owner Read
|   `-- sessions.entries_json and export_text anchor block are decoded by owner session_detail.
|-- Downstream Use
|   `-- Cloud Arrears projection for short_paid, client credit, rent continuity, WhatsApp.
|-- Gaps/Risks/Bugs
|   `-- Short-paid behavior depends on shared builder and backend arrears projection; template is not fully self-owned.
|-- Closure Result
|   `-- PARTIAL
```

### 5.2 Arrears Payment

```text
Arrears Payment
|-- Business Purpose
|   `-- Repay an existing historical Cloud Arrears item.
|-- Employee Flow
|   `-- Select Arrears Payment -> bed -> load open arrears -> select arrears_ref -> payment method -> payment amount -> add to session.
|-- Employee Inputs
|   `-- bed, selected_arrears_ref, payment_amount, payment_method, note.
|-- System Read Fields
|   `-- Cloud Arrears projection items, original amount, already paid, remaining before payment, due/promise date.
|-- Validation
|   |-- Backend checks linked projection/task state.
|   |-- It must reject stale refs and accept projection-open refs.
|   `-- Gap: frontend validator still calls shared `validate()`, so stale-ref UX remains fragile.
|-- Anchor Fields
|   `-- arrears_ref, original_arrears_amount, already_paid_amount, payment_amount, remaining_arrears, settlement_status.
|-- Owner Read
|   `-- Owner detail can read employee_entry structured anchors.
|-- Downstream Use
|   `-- Cloud Arrears settlement, client credit, arrears audit, WhatsApp.
|-- Gaps/Risks/Bugs
|   `-- Most sensitive stale-state path; must be fully event-owned before considering PASS.
|-- Closure Result
|   `-- PARTIAL
```

### 5.3 Deposit In

```text
Deposit In
|-- Business Purpose
|   `-- Record incoming deposit for a bed/customer.
|-- Employee Flow
|   `-- Select Deposit In -> bed -> amount -> payment method -> note -> add to session.
|-- Employee Inputs
|   `-- bed, deposit_amount, payment_method, note.
|-- System Read Fields
|   `-- customer/card context and current deposit context if available.
|-- Validation
|   |-- Basic amount/bed validation exists through shared path.
|   `-- Gap: no clearly isolated deposit_in-specific validator.
|-- Anchor Fields
|   `-- bed, deposit_amount, payment_method, linked_tenant/bed, note.
|-- Owner Read
|   `-- Structured anchors are available to owner detail.
|-- Downstream Use
|   `-- Deposit balance, checkout/deposit-out future reconciliation, WhatsApp.
|-- Gaps/Risks/Bugs
|   `-- Deposit ledger projection is not proven as a dedicated downstream consumer in this audit.
|-- Closure Result
|   `-- PARTIAL
```

### 5.4 Deposit Out

```text
Deposit Out
|-- Business Purpose
|   `-- Record deposit refund without mixing it with rent collection.
|-- Employee Flow
|   `-- Select Deposit Out -> bed -> deposit balance -> refund amount -> method/date -> reason -> arrears check -> add to session.
|-- Employee Inputs
|   `-- bed, refund_amount, payment_method, refund_date, refund_reason, difference_reason when needed, note.
|-- System Read Fields
|   `-- deposit_balance, open arrears check, customer/card context.
|-- Validation
|   |-- Backend requires difference reason if refund amount differs from deposit balance.
|   |-- Backend blocks open/partial arrears unless approved path is used.
|   `-- Gap: frontend event-specific validator still shares generic validate.
|-- Anchor Fields
|   `-- refund_amount, refund_reason, payment_method, checkout_ref, deposit_balance, difference_reason.
|-- Owner Read
|   `-- Structured anchor is readable, but owner/WhatsApp rendering is not fully deposit-specific.
|-- Downstream Use
|   `-- Deposit ledger, checkout guard, owner detail, WhatsApp.
|-- Gaps/Risks/Bugs
|   `-- WhatsApp statement path groups deposit_out near expense-style rendering, which can lose semantic clarity.
|-- Closure Result
|   `-- PARTIAL
```

### 5.5 Checkout

```text
Checkout
|-- Business Purpose
|   `-- Record customer leaving, protect against refunding while arrears remain, and support left-with-arrears tracking.
|-- Employee Flow
|   `-- Select Checkout -> bed -> checkout type -> arrears/deposit warning -> required left-with-arrears fields if applicable -> add to session.
|-- Employee Inputs
|   `-- checkout_date, checkout_type, deposit_refund, belongings info, WhatsApp phone, promise dates, note.
|-- System Read Fields
|   `-- deposit_balance, open_arrears_amount, cloud_arrears_ref, customer/card name, coverage/card end, check-in date.
|-- Validation
|   |-- Backend blocks normal checkout with open/partial arrears.
|   |-- Left With Arrears fields are partially represented.
|   `-- Gap: owner approval/directive path is not fully proven as a closed workflow.
|-- Anchor Fields
|   `-- checkout_date, deposit_refund, outstanding_arrears, owner_approval_required/status, checkout_mode, left-with-arrears tracking fields.
|-- Owner Read
|   `-- Owner detail can read anchor, and Cloud Arrears detail can show some left-customer metadata.
|-- Downstream Use
|   `-- Cloud Arrears, departed customer trace, deposit refund guard, customer isolation.
|-- Gaps/Risks/Bugs
|   `-- Highest risk event: it combines customer exit, deposit, arrears, belongings, phone, and same-bed future customer isolation.
|-- Closure Result
|   `-- PARTIAL
```

### 5.6 Expense

```text
Expense
|-- Business Purpose
|   `-- Record non-rent expense or spending.
|-- Employee Flow
|   `-- Select Expense -> amount -> category -> payment method -> target bed/room if any -> reason/note -> add to session.
|-- Employee Inputs
|   `-- amount, category, payment_method, target_bed/room, reason/note.
|-- System Read Fields
|   `-- optional bed/room context.
|-- Validation
|   |-- Basic amount validation exists.
|   `-- Gap: expense category/target validation is not clearly isolated from generic validation.
|-- Anchor Fields
|   `-- expense_amount, expense_category, target_bed/room, reason, payment_method, note.
|-- Owner Read
|   `-- Owner detail can read structured anchor.
|-- Downstream Use
|   `-- Finance totals and WhatsApp statement.
|-- Gaps/Risks/Bugs
|   `-- Lowest business coupling risk, but category and target semantics should be event-owned.
|-- Closure Result
|   `-- PARTIAL
```

### 5.7 Bed Transfer

```text
Bed Transfer
|-- Business Purpose
|   `-- Record transfer from one bed to another with fee or waiver trace.
|-- Employee Flow
|   `-- Select Bed Transfer -> from_bed -> to_bed -> transfer date -> fee option -> reason -> add/save.
|-- Employee Inputs
|   `-- from_bed, to_bed, transfer_date, fee_option, waiver_reason if waived, transfer_reason, note.
|-- System Read Fields
|   `-- old tenant/card context, old bed context, open arrears warning.
|-- Validation
|   |-- Transfer-specific tests exist around fee and no mutation.
|   `-- Gap: registry builder still calls shared anchor builder, and bed_transfer also has historically separate save paths.
|-- Anchor Fields
|   `-- from_bed, to_bed, transfer_date, fee_amount, fee_status, waiver_reason, transfer_reason, old_tenant_context, old_ttlock_context, note.
|-- Owner Read
|   `-- Owner detail can display employee_entry anchors and transfer fee data.
|-- Downstream Use
|   `-- Owner history/detail, WhatsApp, transfer fee accounting.
|-- Gaps/Risks/Bugs
|   `-- Needs explicit contract decision: always current-session anchor, separate bed-transfer endpoint, or both with reconciliation.
|-- Closure Result
|   `-- PARTIAL
```

## 6. Anchor Completeness Judgment

| Event | Contract Fields Present in Contract | Runtime Builder Path | Completeness Judgment |
|---|---|---|---|
| rent | yes | shared `entryPayload()` + `applyEntryAnchors()` | PARTIAL |
| arrears_payment | yes | shared `entryPayload()` + `applyEntryAnchors()` | PARTIAL |
| deposit_in | yes | shared `entryPayload()` + `applyEntryAnchors()` | PARTIAL |
| deposit_out | yes | shared `entryPayload()` + `applyEntryAnchors()` | PARTIAL |
| checkout | yes, including left-with-arrears fields | shared `entryPayload()` + `applyEntryAnchors()` | PARTIAL |
| expense | yes | shared `entryPayload()` + `applyEntryAnchors()` | PARTIAL |
| bed_transfer | yes | shared `entryPayload()` + `applyEntryAnchors()` plus separate transfer logic history | PARTIAL |

Reason for no PASS: field contracts exist, but per-event builders are not independent implementations. The current system can normalize rich anchors, but a shared builder remains a cross-event coupling point.

## 7. Business Closure Judgment

| Event | Entry UI | Anchor | Upload Payload | Cloud Session | Owner History | Owner Detail | WhatsApp | Downstream Use | Closure |
|---|---|---|---|---|---|---|---|---|---|
| rent | event-mounted | rich fields | structured | entries_json + export_text | structured summary | anchor decoder | statement line | cloud arrears/client credit | PARTIAL |
| arrears_payment | event-mounted | rich fields | structured | entries_json + export_text | structured summary | anchor decoder | statement line | cloud arrears settlement | PARTIAL |
| deposit_in | event-mounted | basic rich fields | structured | entries_json + export_text | structured summary | anchor decoder | statement line | deposit ledger future | PARTIAL |
| deposit_out | event-mounted | rich fields | structured | entries_json + export_text | structured summary | anchor decoder | semantic risk | deposit ledger/checkout | PARTIAL |
| checkout | event-mounted | rich fields | structured | entries_json + export_text | structured summary | anchor decoder | semantic risk | arrears/deposit/customer isolation | PARTIAL |
| expense | event-mounted | basic rich fields | structured | entries_json + export_text | structured summary | anchor decoder | statement line | finance totals | PARTIAL |
| bed_transfer | event-mounted | rich fields | structured/separate path risk | entries_json + export_text | structured summary | anchor decoder | transfer lines | transfer fee accounting | PARTIAL |

## 8. Downstream Usability Judgment

| Downstream Consumer | Current Usability | Risk |
|---|---|---|
| Owner history list | Usable for employee_entry sessions because structured summary is available. | Low/medium: must keep avoiding legacy parser as amount authority. |
| Owner session detail | Usable because structured anchors can be extracted from `entries_json` or anchor block. | Medium: owner detail renderer is not truly event-template-owned. |
| WhatsApp export | Usable for core statement output. | Medium: deposit_out and checkout can be semantically blurred if rendered as expense-like lines. |
| Cloud Arrears | Usable for rent short_paid and arrears_payment paths in backend. | High: stale projection/ref paths need strict event-owned checks. |
| Client credit | Future-usable if it reads canonical anchors. | Medium/high: not fully proven in this audit. |
| Rent continuity | Future-usable if it reads canonical rent and arrears anchors. | Medium: coverage logic must not infer from repayment dates. |
| Deposit ledger | Partially usable. | Medium/high: deposit_in/out/checkout balance projection needs a dedicated SOT check. |

## 9. Found Bugs, Gaps, and Risks

| Priority | Event | Gap/Bug | Impact | Recommended Fix |
|---|---|---|---|---|
| P0 | all | Event validators are wrappers around shared `validate()`. | Cross-event validation leakage can re-break deposit_out, checkout, and arrears_payment. | Implement real `validateRentEntry`, `validateArrearsPaymentEntry`, etc. Keep dry-run error shape. |
| P0 | all | Event anchor builders are wrappers around shared `entryPayload()` and `applyEntryAnchors()`. | Templates are not fully independent SOT producers. | Implement event-owned anchor builders and one dispatcher only. |
| P0 | checkout | Left With Arrears and owner approval workflow are not fully closed. | Customer can leave with arrears/deposit/belongings state that is hard to trace. | Finish checkout-specific state machine and owner approval/request SOT. |
| P0 | arrears_payment | Projection/task stale-ref path remains high risk. | Employee can select stale arrears or be blocked even when projection is open. | Make arrears_payment selector and upload validator projection-first and event-owned. |
| P0 | bed_transfer | Bed transfer has registry anchor support but also historically separate save paths. | Same event may be saved/read through different routes. | Decide one canonical session-anchor path or document strict reconciliation. |
| P1 | deposit_out | Difference reason and deposit balance rely on backend validation, but event-owned frontend validator is not isolated. | Employee may see late upload failures instead of Add-to-Session blocking. | Move difference validation into deposit_out validator. |
| P1 | deposit_in/deposit_out/checkout | Deposit balance projection is not proven end-to-end. | Refund/check-out decisions may lack strong deposit evidence. | Add deposit ledger projection/read audit and tests. |
| P1 | checkout/deposit_out | WhatsApp/owner renderers are not strongly semantic per event. | Refund/checkout can look like generic expense or unclear text. | Split renderers by event type. |
| P1 | expense | Expense category/target fields are not strongly validated as event-owned fields. | Weak expense classification can affect finance review. | Add expense-specific validator and category mapping. |
| P1 | owner detail | Owner detail uses shared anchor renderer, not template-owned rich cards. | Details are readable but not optimized for event evidence. | Add event-specific owner detail render models. |
| P2 | all | `test:employee-entry-template-registry` file exists but no npm script exists. | Required test cannot be run through requested npm script. | Add script in a future non-audit task. |
| P2 | all | Static tests prove registry strings more than runtime DOM behavior. | A DOM mounting bug can pass static tests. | Add browser/runtime smoke when code work resumes. |
| P2 | downstream | Client credit and rent continuity consumers are not asserted against all 7 anchors here. | Future consumers may infer fields differently. | Add downstream contract tests after template closure. |

Counts:

- P0 gaps: 5
- P1 gaps: 5
- P2 gaps: 3

## 10. Recommended Fix Priority

1. P0: Replace shared `validate()` wrappers with real event-specific validators.
2. P0: Replace shared anchor-builder wrappers with real event-specific builders.
3. P0: Finish Checkout / Left With Arrears owner approval, departed-customer trace, and same-bed isolation.
4. P0: Make Arrears Payment projection-first across selector, Add to Session, dry-run, and upload.
5. P0: Normalize Bed Transfer into one canonical session-anchor closure or document/reconcile its separate route.
6. P1: Strengthen Deposit In/Out deposit balance SOT and difference-reason validation.
7. P1: Split WhatsApp and owner detail renderers by event type.
8. P2: Add a registered npm script for template registry test and add browser/runtime template-mount smoke coverage.

Highest-risk event: Checkout / Left With Arrears.

Reason: it combines customer departure, open arrears, deposit refund, belongings, contact phone, owner approval, and same-bed future customer isolation.

## 11. Verification Run

| Command | Result |
|---|---|
| `npm run security:secrets` | PASS: Secret hygiene check passed. |
| `npm run gate:commercial-launch` | PASS command execution; gate result remains `COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO`. |
| `npm run test:employee-entry-anchor-contract` | PASS: 3 tests passed. |
| `npm run test:employee-entry-template-registry` | NOT RUN: npm script is missing, although `tests/employee-entry-template-registry.spec.mjs` exists. |

## 12. Final Audit Result

The system has moved from a single visible generic form toward a 7-template registry, but the closure is not yet architecturally complete. The visible template mounting exists, the anchor contract exists, cloud sessions store structured anchors, and owner decoding can read employee_entry anchors. The remaining core problem is that validators and builders still use shared generic logic, so event-specific templates are not yet full independent business closures.

Overall result: PARTIAL.

Production write: no
Migration: no
Deploy: no
Production cutover: PRODUCTION_NO_GO

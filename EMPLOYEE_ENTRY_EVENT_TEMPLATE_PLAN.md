# Employee Entry Event Template Plan

Date: 2026-07-07
Branch: `fix/auth-closure-001`
Task type: design audit and implementation plan only

## Core Architecture Principle

Employee Entry must not use one shared generic entry template for all 7 event types.

Correct rule:

When the employee selects an event type, the page loads that event type's dedicated entry template.

This means:

- Rent uses the Rent template.
- Arrears Payment uses the Arrears Payment template.
- Deposit In uses the Deposit In template.
- Deposit Out uses the Deposit Out template.
- Checkout uses the Checkout template.
- Expense uses the Expense template.
- Bed Transfer uses the Bed Transfer template.

It must not be:

One big generic form plus many `if/else` show/hide rules.

It must be:

An event template registry where each event owns its UI fields, order, validation, anchor builder, WhatsApp renderer, upload validation, and owner detail renderer.

## Current Generic Template Path

Primary file:

`deploy-worker/public/employee-v3.html`

Current generic template structure:

| Area | Current Path / Function | Problem |
|---|---|---|
| Shared event DOM | HTML around `Step 1` through `Step 8`, including `paymentStep`, amount step, `periodStep`, `depositOutFields`, `checkoutFields`, `exceptionStep`, `reviewStep` | All event types live in the same DOM structure. |
| Event switch | `setEntryType(type)` | Switches type but does not mount a dedicated event template. |
| Field visibility | `syncForm()` | Uses `visible([...], condition)` to hide/show generic fields. |
| Arrears special casing | `employeeApplyArrearsPaymentLayout(type)` | Hides Rent fields when AP is selected, proving AP is still fighting the generic/Rent form. |
| Validation | `validate()` | One large validator handles Rent, AP, Deposit Out, Checkout, Expense, TF, etc. |
| Anchor build | `applyEntryAnchors(e)` / `normalizeEntryAnchor(e)` | One shared anchor builder branches by type. |
| WhatsApp render | `entryStatementLine()` / `renderEntryAnchorForWhatsapp()` | One shared renderer branches by event type. |
| Upload validation | `validateUploadAnchorBatch()` frontend and `handleEmployeeEntry()` backend | Shared upload path validates event-specific requirements after generic payload creation. |
| Owner detail | `extractEmployeeEntryAnchorsFromSession()` and owner UI mapper | Reads structured anchors, but renderer is not event-template-owned. |

Current line-level evidence from read-only inspection:

- `deploy-worker/public/employee-v3.html` has shared steps and common fields around `entryType`, `paymentStep`, `periodStep`, `depositOutFields`, `checkoutFields`, `exceptionStep`, `reviewStep`.
- `syncForm()` controls visibility for `periodStep`, `apFields`, `checkoutFields`, `transferFields`, `expenseFields`, `paymentStep`, `genericBedFieldWrap`.
- `employeeApplyArrearsPaymentLayout(type)` specifically hides Rent-only fields for AP, DR, CO, E, TF.
- `validate()` contains event-specific checks for R, AP, DR, CO, TF in one function.
- `applyEntryAnchors(e)` builds anchors for all event types in one function.

## Events Currently Polluted By Generic / Rent Fields

| Event | Current Pollution | Risk |
|---|---|---|
| Rent | Uses the generic template as its natural shape. | Rent works best today, but it still shares state and validation with unrelated events. |
| Arrears Payment | Must hide monthly rent, rent period, list price, system clear, period due, entry due. | AP can inherit stale Rent fields or stale selected refs. |
| Deposit In | Uses generic bed, amount, payment, tenant/card context. | Lower risk, but it can still inherit Rent period or exception state if not fully reset. |
| Deposit Out | Has dedicated `depositOutFields`, but still sits inside the generic amount/payment/exception flow. | Refund difference logic can be masked by generic amount errors or open arrears checks. |
| Checkout | Has `checkoutFields`, but still sits inside generic flow and left-with-arrears is nested inside normal checkout. | Normal checkout, owner approval, left-with-arrears, and deposit context can mix. |
| Expense | Uses generic amount and payment areas; must hide bed/rent/deposit/arrears context. | Expense can be polluted by irrelevant bed/card context. |
| Bed Transfer | Has special panel and separate save path, but still shares some common bed/amount/payment/reset state. | From/to fields and fee logic can conflict with generic bed/amount assumptions. |

## Required Template Registry

Recommended registry names:

```js
const employeeEntryTemplates = {
  rent: rentEntryTemplate,
  arrears_payment: arrearsPaymentEntryTemplate,
  deposit_in: depositInEntryTemplate,
  deposit_out: depositOutEntryTemplate,
  checkout: checkoutEntryTemplate,
  expense: expenseEntryTemplate,
  bed_transfer: bedTransferEntryTemplate
};
```

Each template must own:

1. `event_type`
2. UI fields
3. Field order
4. Required employee fields
5. System-read fields
6. Forbidden fields
7. Validation rules
8. Anchor builder
9. WhatsApp renderer
10. Upload validation adapter
11. Owner detail renderer adapter

## 7 Template Matrix

### 1. Rent Template

| Category | Definition |
|---|---|
| Template name | `rentEntryTemplate` |
| Event type | `rent` |
| Employee fields | Bed; Payment Method; Paid Amount; Rent Period Start; Rent Period End; Arrears Due Date if short paid; Note |
| System-read fields | Expected Rent; Open Arrears Alert; Customer/Card info; Deposit info |
| Required validation | Bed required; paid amount > 0; payment method required; rent period start/end required; period end valid; expected rent available for normal monthly rent; if paid < expected, arrears due date and note required |
| Anchor builder | Builds `event_type=rent`, `bed`, `expected_rent`, `paid_amount`, `payment_method`, `rent_period_start`, `rent_period_end`, `short_paid`, `arrears_amount`, `arrears_due_date`, `arrears_note`, `arrears_status=open` if short paid |
| WhatsApp renderer | Normal: `[bed] paid amount cash/bank time`; short paid: `[bed] paid amount cash short short_amount due MMDD note` |
| Upload validation | Validate rent-only fields; do not validate AP/deposit/checkout fields |
| Owner detail renderer | Show bed, paid amount, expected rent, short paid status, arrears due date/note, period |
| Forbidden fields | refund amount; checkout type; transfer from/to; expense category; arrears_ref selection |

### 2. Arrears Payment Template

| Category | Definition |
|---|---|
| Template name | `arrearsPaymentEntryTemplate` |
| Event type | `arrears_payment` |
| Employee fields | Bed; Select Cloud Arrears; Payment Method; Payment Amount; Note |
| System-read fields | Open Cloud Arrears Projection; Original Arrears Amount; Already Paid; Remaining Before; Remaining After; Settlement Status |
| Required validation | Bed required; selected open/partial cloud arrears required; payment method required; payment amount > 0; payment amount <= remaining before; settlement status computed |
| Anchor builder | Builds `event_type=arrears_payment`, `bed`, `arrears_ref`, `original_arrears_id`, `original_arrears_amount`, `already_paid_amount`, `payment_amount`, `remaining_arrears`, `settlement_status`, `payment_method`, `note` |
| WhatsApp renderer | `[bed] arrears paid amount cash/bank time note` |
| Upload validation | Projection-aware arrears ref validation; no rent period or monthly rent validation |
| Owner detail renderer | Show linked arrears ref, original amount, paid amount, remaining, settlement status |
| Forbidden fields | monthly rent; rent period; list price; system clear; deposit refund; checkout fields |

### 3. Deposit In Template

| Category | Definition |
|---|---|
| Template name | `depositInEntryTemplate` |
| Event type | `deposit_in` |
| Employee fields | Bed; Deposit Amount; Payment Method; Note |
| System-read fields | Customer/Card info; Existing deposit if any |
| Required validation | Bed required; deposit amount > 0; payment method required; if existing deposit exists, show warning or require note depending on policy |
| Anchor builder | Builds `event_type=deposit_in`, `bed`, `deposit_amount`, `payment_method`, `linked_tenant`, `note` |
| WhatsApp renderer | `[bed] deposit amount cash/bank time` |
| Upload validation | Deposit-in-only validation |
| Owner detail renderer | Show bed, deposit amount, method, linked tenant/card, note |
| Forbidden fields | rent period; arrears_ref; refund reason; checkout fields |

### 4. Deposit Out Template

| Category | Definition |
|---|---|
| Template name | `depositOutEntryTemplate` |
| Event type | `deposit_out` |
| Employee fields | Bed; Actual Refund Amount; Refund Method; Refund Date; Difference Reason if actual refund != deposit balance; Note |
| System-read fields | Deposit Balance; Open Arrears Check |
| Required validation | Bed required; deposit balance loaded or marked needs review; refund amount >= 0; refund method required; refund date required; if actual refund != deposit balance, difference reason required; if open arrears exists, block or require owner approval path |
| Anchor builder | Builds `event_type=deposit_out`, `bed`, `refund_amount`, `actual_refund_amount`, `payment_method/refund_method`, `refund_date`, `deposit_balance`, `refund_difference`, `refund_reason/difference_reason`, `outstanding_arrears`, `owner_approval_required`, `owner_approval_status`, `note` |
| WhatsApp renderer | `[bed] deposit refund amount cash/bank time reason` |
| Upload validation | Difference reason and open arrears checks only; no Rent fields |
| Owner detail renderer | Show deposit balance, actual refund, difference, reason, open arrears state |
| Forbidden fields | monthly rent; rent period; list price; system paid; system clear; checkout type |

### 5. Checkout Template

| Category | Definition |
|---|---|
| Template name | `checkoutEntryTemplate` |
| Event type | `checkout` or `left_with_arrears` mode under checkout anchor |
| Employee fields | Bed; Checkout Type; Checkout Date; Note |
| Left With Arrears employee fields | WhatsApp Phone; Coverage End Date; Confirmed Not Returning Date; Promised Payment Date; Left Arrears Amount; Belongings Held; Belongings Note if held; Note |
| System-read fields | Former Customer/Card info; Check-in Date; Deposit Balance; Open Cloud Arrears; Coverage/Card End Date if available; Overdue Days if calculable |
| Required validation | Bed required; checkout date required; if open arrears and normal checkout, block and require Collect Arrears First / Request Owner Approval / Left With Arrears; if left_with_arrears, required tracking fields must be present |
| Anchor builder | Builds `event_type=checkout`, `checkout_mode`, `left_with_arrears`, `customer_left`, `bed`, `checkout_date`, `outstanding_arrears`, `owner_approval_required`, `owner_approval_status`, left-with-arrears tracking fields when selected |
| WhatsApp renderer | Normal checkout line or left-with-arrears tracking line; no rent/deposit refund fields unless explicitly part of checkout policy |
| Upload validation | Checkout-only validation; open arrears block; left-with-arrears required fields |
| Owner detail renderer | Show checkout mode, date, outstanding arrears, approval status, left customer metadata when applicable |
| Forbidden fields | monthly rent; rent period; list price; system paid; system clear; deposit refund amount unless using Deposit Out event |

### 6. Expense Template

| Category | Definition |
|---|---|
| Template name | `expenseEntryTemplate` |
| Event type | `expense` |
| Employee fields | Amount; Expense Category; Payment Method; Target Bed/Room optional; Reason/Note |
| System-read fields | none required |
| Required validation | Amount > 0; category required; payment method required; reason/note required for non-standard categories |
| Anchor builder | Builds `event_type=expense`, `expense_amount`, `expense_category`, `target_bed`, `reason`, `payment_method`, `note` |
| WhatsApp renderer | `[target] expense amount cash/bank time reason` |
| Upload validation | Expense-only validation |
| Owner detail renderer | Show amount, category, target, method, reason/note |
| Forbidden fields | rent period; deposit balance; arrears_ref; checkout fields |

### 7. Bed Transfer Template

| Category | Definition |
|---|---|
| Template name | `bedTransferEntryTemplate` |
| Event type | `bed_transfer` |
| Employee fields | From Bed; To Bed; Transfer Date; Fee Option; Transfer Reason; Note |
| System-read fields | Old bed/customer/card context; Open arrears alert if any |
| Required validation | From Bed required; To Bed required; From != To; transfer date required; fee option required; if waived, waiver reason required; open arrears warning shown |
| Anchor builder | Builds `event_type=bed_transfer`, `from_bed`, `to_bed`, `transfer_date`, `fee_amount`, `fee_status`, `waiver_reason`, `transfer_reason`, `old_tenant_context`, `old_ttlock_context`, `note` |
| WhatsApp renderer | `[from_bed]` newline `[to_bed]` newline `transfer amount/waived method time reason` |
| Upload validation | Bed-transfer-only validation; may continue using dedicated bed transfer endpoint if kept |
| Owner detail renderer | Show from/to, fee, waiver reason, transfer reason, old context |
| Forbidden fields | rent period; deposit refund fields; arrears payment fields; expense category |

## Forbidden Field Matrix

| Template | Forbidden Fields |
|---|---|
| Rent | refund amount; checkout type; transfer from/to; expense category; arrears_ref selection |
| Arrears Payment | monthly rent; rent period; list price; system clear; deposit refund; checkout fields |
| Deposit In | rent period; arrears_ref; refund reason; checkout fields |
| Deposit Out | monthly rent; rent period; list price; system paid; system clear; checkout type |
| Checkout | monthly rent; rent period; list price; system paid; system clear; deposit refund amount unless using Deposit Out |
| Expense | rent period; deposit balance; arrears_ref; checkout fields |
| Bed Transfer | rent period; deposit refund fields; arrears payment fields; expense category |

## Validation Rule Matrix

| Template | Validator |
|---|---|
| Rent | `rentEntryTemplate.validate(formState, systemState)` |
| Arrears Payment | `arrearsPaymentEntryTemplate.validate(formState, cloudArrearsState)` |
| Deposit In | `depositInEntryTemplate.validate(formState, depositState)` |
| Deposit Out | `depositOutEntryTemplate.validate(formState, depositState, cloudArrearsState)` |
| Checkout | `checkoutEntryTemplate.validate(formState, checkoutState, cloudArrearsState)` |
| Expense | `expenseEntryTemplate.validate(formState)` |
| Bed Transfer | `bedTransferEntryTemplate.validate(formState, transferContext)` |

Current `validate()` should be decomposed into these validators. During migration, `validate()` can become a dispatcher:

```js
function validate() {
  return currentEntryTemplate().validate(readTemplateFormState(), readSystemState());
}
```

## Anchor Builder Matrix

| Template | Anchor Builder |
|---|---|
| Rent | `rentEntryTemplate.buildAnchor(formState, systemState)` |
| Arrears Payment | `arrearsPaymentEntryTemplate.buildAnchor(formState, selectedArrears)` |
| Deposit In | `depositInEntryTemplate.buildAnchor(formState, depositState)` |
| Deposit Out | `depositOutEntryTemplate.buildAnchor(formState, depositState, cloudArrearsState)` |
| Checkout | `checkoutEntryTemplate.buildAnchor(formState, checkoutState, cloudArrearsState)` |
| Expense | `expenseEntryTemplate.buildAnchor(formState)` |
| Bed Transfer | `bedTransferEntryTemplate.buildAnchor(formState, transferContext)` |

Current `applyEntryAnchors(e)` should become a dispatcher only after individual builders exist:

```js
function buildCurrentEntryAnchor() {
  return currentEntryTemplate().buildAnchor(readTemplateFormState(), readSystemState());
}
```

## Upload Validation Mapping

Frontend upload validation should remain event-aware:

```js
validateUploadAnchorBatch(rows) {
  for each row:
    entryAnchorUploadValidators[row.event_type](row)
}
```

Backend upload validation in `handleEmployeeEntry()` should remain the final guard, but it should align with event-specific validators:

| Event | Backend Guard |
|---|---|
| rent | rent period / expected / short paid validation |
| arrears_payment | projection ref / remaining validation |
| deposit_in | deposit amount validation |
| deposit_out | deposit balance / difference reason / arrears block validation |
| checkout | checkout mode / open arrears / owner approval / left-with-arrears validation |
| expense | amount/category validation |
| bed_transfer | from/to/fee/reason validation |

## WhatsApp Renderer Mapping

Current renderer is shared and branches by event type. Target structure:

```js
const employeeEntryWhatsappRenderers = {
  rent: rentEntryTemplate.renderWhatsapp,
  arrears_payment: arrearsPaymentEntryTemplate.renderWhatsapp,
  deposit_in: depositInEntryTemplate.renderWhatsapp,
  deposit_out: depositOutEntryTemplate.renderWhatsapp,
  checkout: checkoutEntryTemplate.renderWhatsapp,
  expense: expenseEntryTemplate.renderWhatsapp,
  bed_transfer: bedTransferEntryTemplate.renderWhatsapp
};
```

## Owner Detail Renderer Mapping

Owner detail should render by canonical anchor `event_type`:

```js
const ownerEntryDetailRenderers = {
  rent: renderOwnerRentDetail,
  arrears_payment: renderOwnerArrearsPaymentDetail,
  deposit_in: renderOwnerDepositInDetail,
  deposit_out: renderOwnerDepositOutDetail,
  checkout: renderOwnerCheckoutDetail,
  expense: renderOwnerExpenseDetail,
  bed_transfer: renderOwnerBedTransferDetail
};
```

## Recommended Minimal Implementation Order

1. Establish template registry without changing behavior.
   - Add `employeeEntryTemplates`.
   - Add a `currentEntryTemplate()` dispatcher.
   - Keep existing generic DOM active.
   - No business behavior change.

2. Split Rent template first.
   - Rent is currently the least broken and should become the reference implementation.
   - Scope: Rent UI fields, validator, anchor builder, WhatsApp renderer.
   - Verify normal Rent and short-paid Rent only.

3. Split Arrears Payment template.
   - Remove all Rent-period/list-price/monthly-rent dependencies.
   - Use Cloud Arrears Projection selector only.

4. Split Deposit Out template.
   - Dedicated refund fields.
   - Dedicated difference reason validation.
   - Dedicated open arrears block.

5. Split Checkout template.
   - Dedicated normal checkout.
   - Dedicated Left With Arrears sub-template.
   - Keep owner approval path explicit.

6. Split Deposit In, Expense, and Bed Transfer templates.
   - These are lower-risk and can follow after high-risk flows are stable.

7. Remove old generic field pollution.
   - Delete or quarantine generic Rent/amount/period fields from non-Rent templates.
   - Remove broad `visible([...], condition)` branching.
   - Replace `validate()` and `applyEntryAnchors()` with dispatchers only.

## Migration Safety Plan

Each step should be one small PR/commit with tests:

1. Template registry smoke.
2. Rent-only closure.
3. Arrears Payment closure.
4. Deposit Out closure.
5. Checkout closure.
6. Deposit In / Expense / Bed Transfer closure.
7. Generic template removal.

No step should modify old cloud history data.

No step should alter `ENTRY_ANCHOR_CONTRACT` unless a separate contract migration is explicitly approved.

## Tests To Add Before Implementation

| Test | Purpose |
|---|---|
| `employee-entry-template-registry.spec.mjs` | Ensures each event has a registered template. |
| `employee-entry-template-forbidden-fields.spec.mjs` | Ensures non-Rent templates do not expose Rent fields. |
| `employee-rent-template.spec.mjs` | Rent template owns its UI, validation, anchor, WhatsApp renderer. |
| `employee-arrears-payment-template.spec.mjs` | AP template has no rent fields and requires Cloud Arrears selection. |
| `employee-deposit-out-template.spec.mjs` | Deposit Out template requires difference reason when needed. |
| `employee-checkout-template.spec.mjs` | Checkout template blocks open arrears unless approved/left-with-arrears. |
| `employee-template-owner-detail.spec.mjs` | Owner detail renderer dispatches by event type. |

## Final Recommendation

Do not keep patching the current generic Entry form.

The current pattern creates recurring cross-event failures:

- Rent fields leak into Arrears Payment.
- Rent fields leak into Deposit Out.
- Normal Checkout hides Left With Arrears.
- Generic validation masks event-specific errors.
- Upload validation catches errors too late.

The correct next engineering move is a template registry plus event-specific templates, starting with Rent as the stable baseline.

## Task Status

| Item | Status |
|---|---|
| code changed | no |
| deployment | no |
| production write | no |
| migration | no |
| parser changed | no |
| `ENTRY_ANCHOR_CONTRACT` changed | no |
| production cutover | PRODUCTION_NO_GO |


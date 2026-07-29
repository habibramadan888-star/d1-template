# Bed Transfer Phase 1 Business Contract V1

Status: `NOT_VERIFIED / REQUIREMENTS_REVIEW`

This document records the user-accepted Phase 1 business contract separately from current implementation facts. It does not upgrade runtime or production status.

## 1. Accepted Business Rules

### Meaning and lineage

- Bed Transfer moves the current resident's effective business context from source bed A to target bed B.
- It must not rewrite the original bed on Rent, Arrears, Deposit, Checkout, or Expense events.
- Original events, original bed, original financial history, and audit history remain immutable.
- The active transfer lineage determines the current business-context bed and must preserve the same continuous stay context.
- Finance must count each original financial event once.
- The semantic identity is `stay_context_id`: check-in starts it, A -> B -> C transfers preserve it, and Checkout ends it. A later check-in starts a new one.

### Access Snapshot and canonical responsibilities

- TTLock / Access Snapshot controls current physical bed status, current D deposit amount, resident MMDD context, current access/rent expiry, and current card/access state.
- The canonical Bed Transfer event proves that the A -> B business action occurred.
- Canonical Archive plus active Transfer Lineage controls history, current business-context bed, arrears recovery context, owner history, correction/void/reversal behavior, Finance deduplication, and Sync State.
- Neither TTLock nor a transfer event alone is sufficient for a completed transfer.

### Forbidden identity and truth sources

These must never identify a resident or establish transfer lineage:

- `card_id`, `tenant_card_id`, `old_ttlock_ref`
- provider phone, `phone_99099`, `+971525199099`
- TTLock card creator phone, card creation time, or provider metadata
- Preview text, WhatsApp export text, owner display text
- `localStorage`, IndexedDB, employee local cache
- Bed number as permanent resident identity

### E/e vacancy rule

- `E` and `e` are equivalent only when they are independent tokens.
- `111 E`, `111 e`, `111 D100 0505 e`, and `e 111` mean vacant.
- `employee`, `office`, `maintenance`, and `newbed` do not mean vacant merely because they contain the letter `e`.
- States are distinct: `vacant`, `not_marked_vacant`, `unknown`, `ambiguous`, `unavailable`, and `stale`.
- Unavailable, ambiguous, stale, or parse-invalid data cannot be overridden by an E/e interpretation.

### Phase 1 operating order

1. Employee selects A -> B.
2. System reads pre-transfer Access Snapshot context.
3. Source A is usable and non-vacant.
4. Target B has a valid independent E/e vacancy marker.
5. Employee submits Bed Transfer.
6. Canonical Archive accepts the event.
7. Owner updates TTLock from A to B.
8. Today Todo remains open until TTLock and canonical state agree.

The reverse order, backdated transfer, historical backfill, and reverse-order bypass are not supported in Phase 1.

### Source and target requirements

- A and B must differ.
- Both beds must be in the same authorized company scope.
- Both Access Snapshots must be available and non-ambiguous.
- Source A must not have a valid independent E/e marker and must have a current active stay/business context.
- Target B must have a valid independent E/e marker.
- D/MMDD residual data on a vacant target is not the incoming resident's fact and must not be adopted.
- No implicit owner override is introduced.

### Stay context

- All lineage-sensitive events must attach to the current stay, not merely to a bed number.
- If the current stay boundary cannot be established, the result remains `UNKNOWN`.
- No phone, card ID, provider metadata, or bed-wide historical merge may create a stay identity.

### TTLock D, MMDD, and expiry

For a remark such as `146 D200 0101`:

- `146` is the current bed.
- `D200` is the current deposit amount in AED.
- `0101` is move-in month/day context only (`MMDD`), with no year.

MMDD must never be converted into a rent coverage date. Transfer must not create Deposit In/Out, change deposit amount, extend or shorten expiry, replace expiry with MMDD, or infer a year. Transfer copies the current expiry unchanged when TTLock is moved.

Rent date semantics accepted for Phase 1:

- Full month: current expiry plus one calendar month, clamped to the last valid target-month day.
- 15-day: current expiry plus 15 calendar days.
- Custom: explicitly selected full date/time.
- Preserve hour, minute, and second.
- Business timezone: `Asia/Dubai`.

The exact API timestamp field, unit, and source timezone remain implementation-audit facts, not assumptions.

### Transfer fee

- Standard fee is AED 50.
- Paid now: exact AED 50, payment method required, Finance category `bed_transfer_fee`, not Rent, Deposit, or Arrears Payment.
- Waived: received amount zero, reason/disclaimer required, owner review/acknowledgement Todo, no arrears.
- Unpaid: AED 50 transfer-fee arrears, repayment date required, unified owner arrears visibility, source remains transfer-fee arrears, no partial repayment, later repayment exactly AED 50.

### Existing arrears

- All open arrears belonging to the current stay follow the active transfer lineage.
- Zero arrears is normal.
- One arrears item retains the same identity and remaining amount.
- Multiple arrears remain all visible in the new current-bed context.
- Original arrears event bed and source event remain unchanged.
- No arrears may be selected by first-item-only behavior or counted twice.

### Deposit

- Deposit follows the resident physically through TTLock.
- Example final state: source `146 e`, target `111 D200 0101`.
- Transfer itself creates no Deposit In/Out, deposit income, refund, or amount change.
- Current deposit remains the latest valid TTLock D amount.
- Transfer may retain source D only as audit context.

### Finance

- A transfer without an explicit money event has zero financial effect.
- It must not create Rent income, Deposit received/refund, Arrears repaid, or Expense.
- Explicit paid transfer fee is `bed_transfer_fee` income.
- Later transfer-fee repayment is separate.
- Bed-price-difference rules are not finalized and are not implemented by this contract.

### Void and reversal

- Owner UI may say Delete, but canonical transfer history is not physically erased.
- Business cancellation uses void/reversal/correction semantics.
- A voided transfer recomputes projections as if the active transfer no longer applies while retaining evidence.
- TTLock rollback is manual unless separately approved; inconsistency remains a Today Todo.

## 2. Explicit Unknown / Not Implemented Decisions

The following remain `UNKNOWN` or `NOT_IMPLEMENTED` and must not be inferred:

- Refund of an already paid AED 50 or bed-price difference.
- Cheaper-bed refund and bed-price-difference formula.
- Partial repayment rule for bed-price-difference arrears.
- Final transfer Todo codes.
- A -> B -> A cycle UI and multiple correction/void UI.
- D0, lowercase d, multiple D, and invalid MMDD semantics.
- Duplicate/conflicting Access Snapshot resolution.
- Final company-scope field name and final stay-context field name.
- Reverse-order, historical, or backdated transfers.
- Automatic TTLock rollback.
- Wi-Fi/electricity-card implementation.
- Provider-identity fallback.

## 3. Required State Transitions

| State | Required evidence | Result |
|---|---|---|
| Preflight | Source non-vacant strict snapshot, target E/e strict snapshot, same company scope, valid current stay | Read-only candidate |
| Accepted | Canonical transfer anchor plus immutable source/target and carryover references | Active transfer lineage |
| Owner follow-up | TTLock moved and canonical state agree | Reconciled |
| Warning | One layer differs or is unavailable | Today Todo remains open |
| Voided/reversed | Correction/void/reversal anchor | Original evidence retained; active projection recomputed |

## 4. Verification Status

- Business rules recorded: `PASS`.
- Runtime compliance: not implied and not verified here.
- Current implementation audit: separate document.
- Production dry-run/live verification: not performed by this task.
- Production cutover: `PRODUCTION_NO_GO`.

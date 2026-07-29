# Bed Transfer Event Selection Fix Result

Date: 2026-06-01, Asia/Dubai

## Fix Summary

| Requirement | Result |
|---|---|
| Selecting Bed Transfer stabilizes to a known internal value | PASS. UI keeps legacy `TF` for compatibility and exposes canonical `bed_transfer` for business state. |
| Old values normalize | PASS. `TF`, `bed_transfer`, `bed-transfer`, `transfer_bed`, and Chinese labels normalize to `TF`. |
| Step 2 renders from normalized event type | PASS. `syncForm()` now mounts and shows `transferFields` for `TF`. |
| Bed Transfer no longer uses generic single-bed Step 2 form | PASS. `genericBedFieldWrap` is hidden when `type==='TF'`. |
| Event change rerenders Step 2 and Step 3 | PASS. `setEntryType()` calls `syncForm()`, and `syncForm()` calls `renderContext()`. |
| Other event types unaffected | PASS. Rent, Arrears Payment, Deposit In/Out, Checkout, and Expense continue to use existing paths. |

## Safety

- Production write: No
- Production write gate: Off
- Production migration: No
- Production cutover: `PRODUCTION_NO_GO`

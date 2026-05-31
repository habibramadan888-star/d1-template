# Arrears Promise Amount Usage Audit

Date: 2026-05-31
Branch: `fix/auth-closure-001`

## Summary

`promise_amount` still exists as a legacy storage/API compatibility field. The default arrears follow-up flow must not ask employees for a promised amount and must not show promised amount in the owner default card.

| Area                          | File / Function                                                                                                 | Current Behavior                                                                                         | Required Behavior                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Employee v3 follow-up card    | `deploy-worker/public/employee-v3.html` / `followupCard()`                                                      | Shows promise date and note inputs; no promised amount input.                                            | Keep only promised payment date and follow-up note.                                              |
| Employee v3 follow-up payload | `deploy-worker/public/employee-v3.html` / `saveFollowup()`                                                      | Now sends `promised_payment_date` and `followup_note`; no `promise_amount`.                              | Default payload must not include `promise_amount`, `promised_amount`, or `promised_amount_fils`. |
| Owner arrears card            | `deploy-worker/public/index-51-main.js` / `renderOwnerArrearsTaskCard()`                                        | Shows system amount, promise date, note, and status; does not call `arrearPromiseAmountLabel()`.         | Keep promised amount out of default owner card.                                                  |
| Owner export/details          | `deploy-worker/public/index-51-main.js` / `exportArrearsWhatsApp()`, `showArrearTaskDetails()`                  | Shows system amount, promise date, and note; no promised amount line.                                    | Keep promised amount out of default owner export/details.                                        |
| Backend update input          | `deploy-worker/src/index.js` / `handleArrearTaskUpdate()`                                                       | Accepts legacy `promise_amount`, `promised_amount`, and `promised_amount_fils` fields for compatibility. | Must not reject old clients, but staff default follow-up must not use these as update fields.    |
| Backend SOT output            | `deploy-worker/src/index.js` / `empTaskToBossArrear()`                                                          | Still exposes legacy-derived `promised_amount_fils` for compatibility.                                   | Allowed as legacy optional API compatibility; not part of default UI.                            |
| Embedded worker mirror        | `deploy-worker/src/index.embedded.js`                                                                           | Mirrored backend compatibility behavior.                                                                 | Keep consistent with source worker until next embedded build pipeline.                           |
| Existing tests                | `tests/employee-arrears-followup-simplified-fields.spec.mjs`, `tests/owner-arrears-no-promised-amount.spec.mjs` | Lock no promised amount in employee default form and owner default card.                                 | Keep and extend with explicit promise amount contract test.                                      |
| Historical scripts/docs       | `scripts/*`, `docs/*`                                                                                           | Some migration/rehearsal/audit references still mention `promise_amount`.                                | Allowed for historical, rehearsal, or migration context only; not default follow-up UI.          |

## Conclusion

The field remains present for legacy compatibility, but the default employee-owner arrears follow-up contract is now date + note driven. The arrears amount is system-controlled.

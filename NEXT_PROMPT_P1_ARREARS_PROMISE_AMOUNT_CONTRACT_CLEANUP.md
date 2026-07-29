# Next Prompt: P1 Arrears Promise Amount Contract Cleanup

Use this prompt after the P0 backend SOT implementation.

```text
# TASK P1-ARREARS-PROMISE-AMOUNT-CONTRACT-CLEANUP

Background:
The owner UI direction is now clear: the arrears card should show the official arrears amount from the system, and employee follow-up should focus on when the customer will pay and the note. The current backend still accepts `promise_amount` in employee updates for compatibility:

`staffAllowed = new Set(["followup_status","promise_date","promise_amount","staff_note"])`

Goal:
Clean up the employee follow-up contract without breaking existing stored data or legacy clients.

Strict prohibitions:
1. Do not execute migration.
2. Do not write production or staging D1.
3. Do not execute D1 export/import/execute.
4. Do not modify financial formula.
5. Do not modify dashboard calculation.
6. Do not modify tenant scope rules.
7. Do not print secrets/tokens/cookies.
8. Production cutover remains PRODUCTION_NO_GO.

Final business rule:
1. Official arrears amount is system-controlled.
2. Employee does not decide official arrears amount.
3. Employee follow-up core fields:
   - `followup_status`
   - `promise_date`
   - `staff_note`
4. `promise_amount` is deprecated for employee input.
5. Existing stored `promise_amount` can remain readable for legacy compatibility, but owner default UI must not depend on it.

Backend cleanup:
1. Keep accepting `promise_amount` temporarily only if needed for backward compatibility.
2. Prefer ignoring employee-submitted `promise_amount` or marking it deprecated without changing official arrears amount.
3. Do not reject legacy clients abruptly unless tests and release notes are updated.
4. Manager/admin paths can keep amount adjustment only where explicitly authorized by existing business rules.
5. Add comments or docs marking employee `promise_amount` deprecated.

Frontend cleanup:
1. Employee follow-up form must not render a promised amount input.
2. Employee request payload must not send `promise_amount`.
3. Owner arrears card defaults to official amount plus employee date/note.
4. Do not show raw `promise_amount` debug fields.

Tests:
1. Employee form does not contain promise amount input.
2. Employee follow-up payload does not include `promise_amount`.
3. Backend accepts legacy payload without changing official arrears amount.
4. Owner card displays official amount, promise date, and staff note.
5. Production cutover remains PRODUCTION_NO_GO.

Validation:
- `npm run test:employee-arrears-followup-fields`
- `npm run test:owner-arrears-api-contract`
- `npm run security:secrets`
- `npm run gate:commercial-launch`
- `npm run qa:employee-entry-staging`

Expected output:
1. Backend compatibility behavior.
2. Frontend payload behavior.
3. Tests added/updated.
4. Confirmation no migration, no D1 write, no production cutover.
```

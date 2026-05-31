# Arrears Promise Amount Contract Cleanup Result

Date: 2026-05-31
Branch: `fix/auth-closure-001`

## Final Contract

| Rule                                                         | Status     | Notes                                                                                             |
| ------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------- |
| `promised_amount_fils` may remain as legacy optional         | Locked     | Kept for backward compatibility only.                                                             |
| Default UI does not display `promise_amount`                 | Locked     | Owner default card does not render promised amount.                                               |
| Employee default form does not submit `promise_amount`       | Locked     | Employee v3 sends `promised_payment_date` and `followup_note`.                                    |
| Owner default card does not show promised amount             | Locked     | Owner card shows system amount, promise date, note, and status.                                   |
| Backend accepts old fields without rejecting old clients     | Locked     | `promise_amount`, `promised_amount`, and `promised_amount_fils` are allowed in staff patch input. |
| Backend staff default update does not write `promise_amount` | Locked     | Staff branch ignores legacy amount fields as update values.                                       |
| Database field deletion                                      | Not done   | No schema change or migration.                                                                    |
| Existing data impact                                         | None       | No D1 write or migration was performed.                                                           |
| Documentation status                                         | Deprecated | `promise_amount` is documented as legacy optional.                                                |

## Current Default Flow

1. System determines arrears amount.
2. Employee updates promised payment date.
3. Employee updates follow-up note.
4. Owner sees system arrears amount, promised date, note, and status.

## Safety

- Production deploy: no
- Migration: no
- D1 write: no
- Business write: no
- Financial formula change: no
- Dashboard calculation change: no
- Production cutover: `PRODUCTION_NO_GO`

## Verification

| Command                                         | Result | Notes                                                     |
| ----------------------------------------------- | ------ | --------------------------------------------------------- |
| `npm run security:secrets`                      | Pass   | Secret hygiene check passed.                              |
| `npm run gate:commercial-launch`                | Pass   | `COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO`.           |
| `npm run test:arrears-promise-amount-contract`  | Pass   | 4/4 tests passed.                                         |
| `npm run test:employee-arrears-followup-fields` | Pass   | 2/2 tests passed.                                         |
| `npm run test:owner-arrears-no-promised-amount` | Pass   | 2/2 tests passed.                                         |
| `npm run test:readonly-admin-role`              | Pass   | 2/2 tests passed.                                         |
| `npm run qa:employee-entry-staging`             | Pass   | `MANUAL_REQUIRED`; write execution stayed `DRY_RUN_ONLY`. |

# Bed Transfer Entry Ledger SOT Final Result

## Scope

Task: `BED-TRANSFER-ENTRY-LEDGER-SOT-FINAL-001`

Branch: `fix/auth-closure-001`

Production cutover: `PRODUCTION_NO_GO`

## Root Cause

| Finding | Result |
|---|---|
| Current handler | `POST /api/employee/bed-transfers` via `handleEmployeeBedTransferCreate` |
| Entry Ledger bypass | Partially. The handler wrote an `entry_events` row, but the UI treated Bed Transfer as a separate save path and did not append the returned event to Current Session. |
| `transfer_note_required` source | Backend validation required `note`, even though the final business contract says note is optional and should fall back to reason / waiver reason / `bed_transfer`. |
| Current Session remained 0 | Employee UI reset/refreshed after the API call without appending or refetching a synced Entry Ledger draft row. Amount `0` events also needed explicit support for waived transfers. |
| Split facts risk | `bed_transfer_events` and `entry_events` could drift conceptually because Bed Transfer was still treated as an extension flow rather than an Entry Ledger event surfaced in the session ledger. |
| Final fix approach | Scheme B: keep `POST /api/employee/bed-transfers`, but make it internally create the Entry Ledger event first, then the linked `bed_transfer_events` anchor, and return a `session_entry` for Current Session. |

Root cause categories:

- `BED_TRANSFER_BYPASSED_ENTRY_LEDGER`
- `TRANSFER_NOTE_CONTRACT_MISMATCH`
- `CURRENT_SESSION_FILTERED_OR_NOT_APPENDED`
- `SPLIT_ENTRY_AND_TRANSFER_FACTS`

## Implemented Fix

| Requirement | Status |
|---|---|
| Bed Transfer enters Entry Ledger | PASS |
| `event_type = bed_transfer` | PASS |
| Paid mode amount | PASS, `amount_fils = 5000` / `50 AED` |
| Waived mode amount | PASS, `amount_fils = 0` |
| Paid payment method required | PASS |
| Waived waiver reason required | PASS |
| Empty note no longer blocks save | PASS |
| `transfer_note_required` removed | PASS |
| `bed_transfer_events.entry_event_id` linked to `entry_events.id` | PASS |
| Current Session appends saved Bed Transfer | PASS |
| Synced Bed Transfer does not block handover export | PASS |
| Step 8 uses Bed Transfer summary | PASS |
| Employee summary hides TTLock phone/account data | PASS |
| Occupancy/deposit/arrears/TTLock untouched | PASS |

## Validation

| Command | Result |
|---|---|
| `node --check deploy-worker/src/index.js` | PASS |
| `node --check .tmp/employee-v3-inline-check.js` | PASS |
| `npm run security:secrets` | PASS |
| `npm run gate:commercial-launch` | PASS, `PRODUCTION_NO_GO` |
| `npm run test:readonly-admin-role` | PASS |
| `npm run build:embedded:dry-run` | PASS |
| `npm run verify:embedded-worker` | PASS |
| `npm run audit:worker-drift` | PASS, critical mismatch `0` |
| `npm run test:bed-transfer-entry-ledger-save` | PASS |
| `npm run test:bed-transfer-current-session-append` | PASS |
| `npm run test:bed-transfer-no-transfer-note-required` | PASS |
| `npm run test:bed-transfer-paid-and-waived` | PASS |
| `npm run test:bed-transfer-linked-anchor` | PASS |
| `npm run test:bed-transfer-no-mutation` | PASS |
| `npm run test:bed-transfer-fee-no-mutation` | PASS |
| `npm run test:bed-transfer-live-save-final-fix` | PASS |
| `npm run test:bed-transfer-review-flags-non-blocking` | PASS |
| `npm run test:bed-transfer-step8-summary` | PASS |
| `npm run test:bed-transfer-note-cid-phone-sanitizer` | PASS |
| `npm run test:bed-transfer-event-ledger-idempotency` | PASS |
| `npm run test:bed-transfer-record-only-save-api` | PASS |
| `npm run test:bed-transfer-fee-waiver-required` | PASS |

## Deploy

Status: PASS.

Command:

`npx wrangler deploy --config wrangler.toml`

Worker URL:

`https://homelink-finance.habibramadan888.workers.dev`

Worker version:

`3d1e4ff2-a12d-48bf-8ec2-694e520c696e`

Deploy scope:

- Worker code and static asset deployment.
- Uploaded modified asset: `/employee-v3.html`.
- No production migration.
- No D1 execute.

## Production Smoke

Status: PASS.

Approved smoke scope:

- Smoke A paid Bed Transfer: `144 -> 145`, `amount_fils = 5000`.
- Smoke B waived Bed Transfer: safe pair, `amount_fils = 0`.

| Smoke | Result | Transfer | Entry Event | Amount | Owner Visible | Current Session Entry |
|---|---|---|---|---|---|---|
| Paid | PASS | `bt-20260601-144-145-c38dc6ad` | `trace-mpvqbkep-4d817726` | `5000` fils / `50 AED` | yes | yes |
| Waived | PASS | `bt-20260601-103-111-9abb18c4` | `trace-mpvqbocv-86ac9029` | `0` fils | yes | yes |

Smoke checks:

- `transfer_note_required` observed: no.
- Password printed: no.
- Token printed: no.
- Cookie printed: no.
- D1 execute: no.
- Migration: no.
- Production cutover: `PRODUCTION_NO_GO`.

Production write scope:

- Two API-approved Bed Transfer smoke records.
- Paid smoke wrote one `entry_events` row and one linked `bed_transfer_events` anchor.
- Waived smoke wrote one `entry_events` row and one linked `bed_transfer_events` anchor.
- Idempotency/audit behavior is retained by the Bed Transfer handler.

No-mutation confirmation:

- No occupancy mutation.
- No deposit mutation.
- No arrears clearing.
- No TTLock mutation.
- No dashboard calculation change.
- No financial formula change.

## Final Status

Bed Transfer is now treated as an Entry Ledger event with a linked Bed Transfer anchor.

Production cutover remains `PRODUCTION_NO_GO`.

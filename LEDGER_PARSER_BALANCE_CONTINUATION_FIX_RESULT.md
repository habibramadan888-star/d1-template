# Ledger Parser Balance Continuation Fix Result

Date: 2026-07-03
Branch: fix/auth-closure-001
Production cutover: PRODUCTION_NO_GO

## Root Cause

`parseTXT()` in `deploy-worker/public/index-51-main.js` called `applySpokenContinuation()` before explicit money-row parsing.

Because `applySpokenContinuation()` treats any line containing `balance` as a continuation note, this valid money row was swallowed as a note on the previous row:

`#911-831 500.00 O was balance from rent`

Root cause classification: `NOTE_TEXT_CAUSED_SKIP`.

## Parser Change

Changed file/function:

- `deploy-worker/public/index-51-main.js`
- `parseTXT(text)`
- `applySpokenContinuation(entry, line, sessionDate)`
- new helper: `isExplicitMoneyRowLine(line)`
- new helper: `isSectionHeaderLine(line)`
- new helper: `splitRoomTransferToken(token)`
- new helper: `parseDeclaredTotals(lines)`
- new helper: `reconcileDeclaredTotals(declared, parsed)`

Fix behavior:

- Explicit money rows are protected from continuation-note handling.
- Section headers are protected from refund/note continuation handling.
- Hyphenated bed rows such as `#911-831 500.00 O ...` parse as money rows.
- ASCII transfer money rows such as `#144->145 bed_transfer 50.00 ...` parse as transfer rows.
- No-amount waiver notes such as `#911→831 T 豁免 ...` do not enter money totals.
- Header declared totals are parsed and compared against parsed totals.

## Before / After

| Metric | Before | After |
|---|---:|---:|
| cash_receipts | 4,360.00 | 4,860.00 |
| bank_receipts | 2,160.00 | 2,160.00 |
| deposit_refund | 400.00 | 400.00 |
| expenses | 5.00 | 5.00 |
| gross_income | 6,520.00 | 7,020.00 |
| cash_handover | 3,955.00 | 4,455.00 |

Missing row fixed: yes.

## Reconciliation Warnings

Valid fixture result:

- `reconciliation.ok = true`
- `reconciliation.warnings = []`

Mismatch fixture result:

- emits `DECLARED_GROSS_MISMATCH`
- emits `CASH_RECONCILIATION_MISMATCH`

## Tests

Passed:

- `node --check deploy-worker/public/index-51-main.js`
- `node --check tests/ledger-parser-balance-continuation.spec.mjs`
- `node --check tests/ledger-parser-declared-reconciliation.spec.mjs`
- `npm run test:ledger-parser-balance-continuation`
- `npm run test:ledger-parser-declared-reconciliation`
- `npm run security:secrets`
- `npm run gate:commercial-launch` = `PRODUCTION_NO_GO`

Not present:

- `npm run test:ledger-parser`
- `npm run test:handover-parser`

## Deploy

Deploy attempted because the parser is in the live frontend Worker asset path.

Deploy result: no.

Blocker:

- `npx wrangler deploy --config wrangler.toml` failed with `Failed to fetch auth token: 400 Bad Request`.
- Wrangler reported that non-interactive deploy requires `CLOUDFLARE_API_TOKEN`.

No deployment was completed in this task.

## Safety

| Item | Status |
|---|---|
| Production write | No |
| Write gate | Off |
| Migration | No |
| Entry save logic changed | No |
| Bed Transfer save logic changed | No |
| Dashboard calculation changed | No |
| Financial formula changed | No |
| Secret committed | No |
| Production cutover | PRODUCTION_NO_GO |


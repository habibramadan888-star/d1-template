# TTLock Console Count Stage Reconciliation

Date: 2026-06-02
Scope: read-only provenance audit. No new production authentication/login was executed in this audit because login creates `active_sessions` and this task forbids production D1 writes.
Production cutover: PRODUCTION_NO_GO

## Known Read-Only Evidence

From the previous masked read-only probe of `/api/lock/cards?purpose=arrears_pool`:

| Metric | Count |
|---|---:|
| locks | 8 |
| total cards | 226 |
| raw expired cards | 61 |
| unique raw expired beds | 60 |

From the authenticated backend SOT smoke:

| Metric | Count |
|---|---:|
| backend SOT `ttlock_expired_unpaid_count` | 41 |
| backend SOT `existing_arrears_count` | 0 |
| backend SOT `action_count` | 41 |
| backend SOT `amount_fils` | 2935000 |

From user-visible owner console acceptance:

| Metric | Count |
|---|---:|
| console visible current overdue/action cards | about 23 |

## Stage Reconciliation

| Stage | Rule | Count |
|---|---|---:|
| 1 | All cards returned by live TTLock `/api/lock/cards` | 226 |
| 2 | Cards where TTLock expiry timestamp is in the past | 61 |
| 3 | Unique expired beds from raw TTLock probe | 60 |
| 4 | Backend arrears SOT rows after staff/vacant exclusion, bed parsing, rent mapping, and backend dedupe | 41 |
| 5 | Console current occupied latest card per bed via `rc_currentOccupiedCards()` | not recomputed in this no-write audit |
| 6 | Console continuity rows with valid rent/payment coverage check via `rc_bestCoverageForCard()` | not recomputed in this no-write audit |
| 7 | Console rows excluding existing open arrears via `rc_activeRentArrearsMap()` | not recomputed in this no-write audit |
| 8 | Console rows excluding already-paid/renewed cards through `coverageDate >= card.end` or `gapDays <= GAP_LIMIT` | not recomputed in this no-write audit |
| 9 | Console rows excluding locally resolved leakage items through `rc_getResolutions()` | not recomputed in this no-write audit |
| 10 | Final console visible unresolved leakage/action count `unresolvedMissing.length` | about 23, user-observed |

## Likely Console Filter

LIKELY_CONSOLE_FILTER_FOUND

The likely reduction from backend SOT `41` to user-visible `≈23` happens in the owner console continuity module, not in the backend arrears SOT:

- `rc_cardContinuityRun()` derives card status from rent coverage and existing arrears.
- `status === 'missing'` means either short payment for the anchored period or card expiry beyond rent coverage by more than `GAP_LIMIT = 3` days.
- `knownArrears`, `ok`, `noCoverage`, and `noDate` rows are not counted as unresolved missing.
- `rc_cardContinuityRender()` removes locally resolved rows from the visible action count: `unresolvedMissing = enriched.filter(c => c.status === 'missing' && !c.resolved)`.

This explains why the console count can be materially lower than the backend SOT count.

## Limitations

Exact recomputation of the `≈23` value requires the current browser-side inputs used by the continuity module:

- current `roomsData` from TTLock,
- imported cloud/history sessions in `state.saved` and `state.analysisSessions`,
- rent reference config from `rc_getRoomCfg()`,
- current open local arrears state used by `rc_activeRentArrearsMap()`,
- local resolution records from `rc_getResolutions()`.

Those are not all available from a backend read-only endpoint today. Reproducing them through a new authenticated production login was intentionally avoided because this task forbids production D1 writes.


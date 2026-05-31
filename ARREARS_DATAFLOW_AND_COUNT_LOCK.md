# Arrears Dataflow And Count Lock

## Single Pool Contract

Canonical API: `/api/boss/arrears/followup-tasks`

Canonical backend aggregator: `empListMergedArrearTasksDetailed()`

Frontend display should consume the canonical API result. Frontend `buildArrearsFollowupPool()` can remain only as a display normalizer or test fixture, not as a competing business source of truth.

## Required Response Shape

```text
summary:
  total_count
  total_amount_fils
  existing_arrears_count
  ttlock_expired_unpaid_count
  promised_unpaid_count or employee_promised_count
  config_missing_count or ttlock_missing_rent_count

preview_tasks:
  first N tasks, used for overview summary only

all_tasks:
  full task list

sources:
  existing_arrears_record
  ttlock_expired_unpaid
```

## Current Backend Shape

Backend currently returns:

| Required                          | Current Backend Field                                                             |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `total_count`                     | `summary.total_count`, top-level `total_count`                                    |
| `total_amount_fils`               | `summary.total_amount_fils`, top-level `total_amount_fils`                        |
| `existing_arrears_count`          | `summary.existing_arrears_count`, top-level `existing_arrears_count`              |
| `ttlock_expired_unpaid_count`     | `summary.ttlock_expired_unpaid_count`, top-level `ttlock_expired_unpaid_count`    |
| `promised_unpaid_count`           | Current field is `employee_promised_count`; rename or alias needed for final lock |
| `config_missing_count`            | Current field is `ttlock_missing_rent_count`; alias needed for final lock         |
| `preview_tasks`                   | Present                                                                           |
| `all_tasks`                       | Present                                                                           |
| `sources.existing_arrears_record` | Present                                                                           |
| `sources.ttlock_expired_unpaid`   | Present                                                                           |

## Dataflow Lock Matrix

| Data Step                  | Source                                             | Expected                                           | Current Risk                                                     | Required Test                                        |
| -------------------------- | -------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| Existing arrears read      | `arrear_tasks`, legacy `arrears` behind one source | Open tasks with remaining amount only              | Two tables can create dedupe mistakes or count mismatch.         | Existing-source restore test and dedupe safety test. |
| TTLock expired unpaid read | TTLock cards + bed rent config                     | Expired unpaid rows with rent amount only          | TTLock failure or rent missing can hide or poison entire module. | TTLock source partial-failure test.                  |
| Missing rent handling      | TTLock source                                      | Exclude from default list; count as config missing | UI may accidentally show amount-missing card.                    | Missing-rent no-default-card test.                   |
| Dedupe                     | Across all tasks                                   | Prevent true duplicates only                       | Dedupe may incorrectly collapse different sources.               | Cross-source dedupe test.                            |
| Summary                    | `all_tasks`                                        | Counts and amount derived from full task list      | Separate summary path can drift.                                 | Summary/list consistency test.                       |
| Preview                    | `all_tasks.slice(0,N)`                             | Preview is subset only                             | Preview count can be mistaken as total.                          | Assert visible count / total count UI.               |
| View all                   | `all_tasks`                                        | Expands to full loaded list                        | Button has regressed to no-op.                                   | `arrears-view-all-button` test.                      |
| Partial failure            | One source fails                                   | Show available source plus warning                 | One failure can overwrite whole module.                          | `owner-arrears-partial-failure` test.                |
| Frontend normalizer        | API rows only                                      | Display mapping only                               | Frontend pool can become second source of truth.                 | API contract test must assert backend authority.     |

## Non-Negotiable Rules

1. `summary` must be derived from `all_tasks`.
2. `preview_tasks` must be derived from `all_tasks`.
3. View all must render `all_tasks`.
4. If preview displays 5 of N, UI must display `已显示 5 / 共 N`.
5. Existing source failure cannot hide TTLock rows.
6. TTLock source failure cannot hide existing rows.
7. Amount-missing rows cannot fail the entire module.
8. Unsupported source must not render in owner default list.

## P0 SOT Update

Backend `/api/boss/arrears/followup-tasks` is the locked SOT for owner arrears dataflow and counts.

- `summary.total_count` is the owner-visible total count authority.
- `summary.total_amount_fils` is the owner-visible total amount authority.
- `summary.existing_arrears_count` and `summary.ttlock_expired_unpaid_count` are the source-count authorities.
- `summary.config_missing_count` records TTLock rows excluded because bed rent mapping is missing.
- `summary.dedupe_dropped_count` records backend dedupe drops.
- Frontend must not recompute source counts, total amount, or dedupe drops.
- View-all and load-more must use backend `pagination`.

## Live Deployment Status

- Production Worker version `58c0228a-a2e5-4040-8fcc-fa5eeee43860` contains the backend SOT dataflow fix.
- Live static asset `/index-51-main.js` references `/api/boss/arrears/followup-tasks` and does not contain the legacy client TTLock loader call in owner arrears loading.
- Summary, preview, view-all, source counts, dedupe drops, and pagination remain backend-authoritative.
- Unauthenticated live checks confirmed protected endpoints return standardized 401 responses.
- Authenticated live count/list/view-all verification is `MANUAL_REQUIRED` because creating a new production session would write D1.
- No D1 write or migration was executed.
- Production remains `PRODUCTION_NO_GO`.

## Source Filter / Sort Lock

- Owner arrears filter exposes only `all`, `ttlock_expired_unpaid`, and `existing_arrears_record`.
- Source counts and totals remain backend-authoritative.
- Frontend room/bed sorting is display-only and must not mutate `state.arrears`, source counts, totals, or backend SOT payloads.
- WhatsApp export uses the currently displayed Backend SOT rows after source filter and display sort.
- No D1 write or migration is allowed for this UI layer.

## WhatsApp Export Dataflow Lock

- WhatsApp export must use Backend SOT rows already present in the owner arrears state.
- If selected rows exist, export only selected rows.
- If selected rows do not exist, export the current source-filtered rows.
- Do not merge selected rows with filtered rows.
- Do not merge `preview_tasks` with `tasks` inside the WhatsApp builder.
- No frontend business aggregation may be restored.
# Acceptance Bugfix Lock - 2026-05-31

- Owner batch send is dry-run only; real employee directive delivery requires separate approval.
- The dry-run list uses selected arrears rows; if no rows are selected, WhatsApp export uses the current filtered rows.
- No D1 write, migration, or backend SOT rewrite is allowed in this acceptance bugfix.
- Production cutover remains `PRODUCTION_NO_GO`.

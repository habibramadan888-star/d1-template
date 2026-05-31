# Arrears Business Logic Lock

## Final Business Definition

Owner arrears follow-up may show only two sources:

1. `existing_arrears_record`: system-owned existing arrears records.
2. `ttlock_expired_unpaid`: TTLock card expired and unpaid, amount derived from configured bed rent.

No third source is allowed as a default owner arrears task.

## Business Rule Matrix

| Business Rule                                                | Current Implementation                                                                                                                                                    | Gap                                                                                                                              | Severity | Fix Needed                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| Only two sources are allowed                                 | Backend `source_authority` returns `existing_arrears_record` and `ttlock_expired_unpaid`; frontend normalizer rejects unsupported source as `unsupported_arrears_source`. | Legacy names still normalize into approved source; this is acceptable only as compatibility input, not display source.           | P0       | Keep display and API output restricted to the two canonical source names.                           |
| Existing arrears amount comes from arrears record            | Backend maps `arrear_tasks` and legacy `arrears`; frontend uses `arrearAmountLabel`.                                                                                      | Multiple historical tables can feed existing source, so source contract must identify it as existing record, not a third source. | P0       | Keep all legacy table ingestion behind `existing_arrears_record`.                                   |
| TTLock expired unpaid amount comes from bed rent             | Backend TTLock loader uses rent configuration and tracks `ttlock_missing_rent`.                                                                                           | Need continuous test that missing rent rows are not counted as formal arrears.                                                   | P0       | Keep missing-rent rows in QA/config warning, not default list.                                      |
| Missing rent cannot become official arrears                  | Backend reports `ttlock_missing_rent`; frontend must not show amount-unknown official card.                                                                               | Frontend fallback paths must not reintroduce `amount unknown` cards.                                                             | P0       | Test no `金额待核对` in owner arrears card.                                                         |
| Amount is system-decided                                     | UI no longer asks employee for promised amount; owner top amount remains system amount.                                                                                   | Backend still accepts staff `promise_amount` as compatibility field.                                                             | P1       | Future backend cleanup: remove staff `promise_amount` from allowed patch after compatibility audit. |
| Employee only feeds promise date and note                    | Employee v3 posts `promise_date` and `staff_note`; v2 no longer renders promised amount input.                                                                            | Tail-balance entry creation still has `promise_amount` for transaction arrears creation; separate domain.                        | P1       | Keep follow-up task contract separate from entry/tail-balance creation.                             |
| Owner card fields are bed/amount/source/due/date/note/status | Current owner card renders these fields.                                                                                                                                  | Detail/export paths must remain aligned.                                                                                         | P1       | Tests must cover card, details, and WhatsApp export.                                                |
| No debug/internal display                                    | Internal IDs hidden in card title; source labels mapped to Chinese.                                                                                                       | Any new field addition can regress without card contract tests.                                                                  | P1       | Maintain no-debug/no-internal-id tests.                                                             |

## Forbidden Default Sources

| Source / Row Type                                 | Default Owner Arrears List |
| ------------------------------------------------- | -------------------------- |
| `random customer rows`                            | Forbidden                  |
| `unknown source`                                  | Forbidden                  |
| generic `current_due_unpaid` as standalone source | Forbidden                  |
| amount unknown default task                       | Forbidden                  |
| debug/test rows                                   | Forbidden                  |
| imported unrelated rows                           | Forbidden                  |
| unpaid unclear rows                               | Forbidden                  |

## Owner Default View

Owner default card shows:

1. Bed.
2. System amount.
3. Source label.
4. Overdue/due line.
5. Employee promise date.
6. Employee note.
7. Business status.

Owner default card does not show:

1. Promised amount.
2. Internal IDs.
3. Raw source/status fields.
## Arrears Directive Real Delivery Lock - 2026-05-31

- Dry-run is not real employee directive delivery.
- Real delivery requires persistent directive state in `arrear_tasks`.
- Employee feedback is limited to promised payment date and follow-up note.
- Employees must not edit arrears amount or close tasks.
- Production writes require separate approval; live remains dry-run before approval.
- Production cutover remains `PRODUCTION_NO_GO`.

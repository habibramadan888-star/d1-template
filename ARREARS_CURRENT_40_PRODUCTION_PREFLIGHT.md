# Arrears Current 40 Production Preflight

Generated: 2026-06-01T12:26:36.939Z

This is a production read-only/API preflight report. It does not open the write gate, does not call directive create, and does not write arrears business data.

## Summary

| Field | Value |
| --- | --- |
| owner auth usable | yes |
| owner /api/me status | 200 |
| boss SOT API status | 200 |
| current SOT count | 46 |
| expected count 40 | no |
| existing_arrears_record count | 5 |
| ttlock_expired_unpaid count | 41 |
| materializable ready count | 46/46 |
| already assigned count | 1 |
| target employee auth usable | yes |
| target employee role | staff |
| write gate | not opened by this preflight |
| production cutover | PRODUCTION_NO_GO |
| preflight result | BLOCKED |

## Blockers

- actual_count_46_does_not_equal_expected_40

## Task Readiness

| # | Room/Bed | Source | Amount | Due date | Stable source_ref | Already assigned | Ready |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 144 | existing_arrears_record | 50.00 AED | 2026-06-10 | yes | yes | yes |
| 2 | 219-4014 | existing_arrears_record | 200.00 AED | 2026-05-22 | yes | no | yes |
| 3 | 652 | existing_arrears_record | 130.00 AED | 2026-05-20 | yes | no | yes |
| 4 | 835 | existing_arrears_record | 100.00 AED | 2026-05-20 | yes | no | yes |
| 5 | 835 | existing_arrears_record | 200.00 AED | 2026-05-20 | yes | no | yes |
| 6 | 112 | ttlock_expired_unpaid | 770.00 AED | 2026-06-01 | yes | no | yes |
| 7 | 113 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 8 | 125 | ttlock_expired_unpaid | 700.00 AED | 2026-05-31 | yes | no | yes |
| 9 | 138 | ttlock_expired_unpaid | 770.00 AED | 2026-06-01 | yes | no | yes |
| 10 | 224 | ttlock_expired_unpaid | 800.00 AED | 2026-06-01 | yes | no | yes |
| 11 | 324 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 12 | 325 | ttlock_expired_unpaid | 630.00 AED | 2026-05-07 | yes | no | yes |
| 13 | 329 | ttlock_expired_unpaid | 630.00 AED | 2026-05-30 | yes | no | yes |
| 14 | 332 | ttlock_expired_unpaid | 780.00 AED | 2026-06-01 | yes | no | yes |
| 15 | 4210 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 16 | 423 | ttlock_expired_unpaid | 630.00 AED | 2026-06-01 | yes | no | yes |
| 17 | 429 | ttlock_expired_unpaid | 630.00 AED | 2026-06-01 | yes | no | yes |
| 18 | 434 | ttlock_expired_unpaid | 780.00 AED | 2026-06-01 | yes | no | yes |
| 19 | 612 | ttlock_expired_unpaid | 730.00 AED | 2026-06-01 | yes | no | yes |
| 20 | 621 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 21 | 627 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 22 | 635 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 23 | 636 | ttlock_expired_unpaid | 730.00 AED | 2026-05-28 | yes | no | yes |
| 24 | 725 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 25 | 726 | ttlock_expired_unpaid | 730.00 AED | 2026-05-31 | yes | no | yes |
| 26 | 752 | ttlock_expired_unpaid | 730.00 AED | 2026-06-01 | yes | no | yes |
| 27 | 754 | ttlock_expired_unpaid | 730.00 AED | 2026-06-01 | yes | no | yes |
| 28 | 811 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 29 | 813 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 30 | 821 | ttlock_expired_unpaid | 700.00 AED | 2026-05-28 | yes | no | yes |
| 31 | 826 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 32 | 834 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 33 | 836 | ttlock_expired_unpaid | 750.00 AED | 2026-05-27 | yes | no | yes |
| 34 | 842 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 35 | 847 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 36 | 8513 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 37 | 911 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 38 | 9114 | ttlock_expired_unpaid | 750.00 AED | 2026-05-31 | yes | no | yes |
| 39 | 913 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 40 | 916 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 41 | 917 | ttlock_expired_unpaid | 700.00 AED | 2026-05-31 | yes | no | yes |
| 42 | 918 | ttlock_expired_unpaid | 750.00 AED | 2026-05-31 | yes | no | yes |
| 43 | 938 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 44 | 942 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 45 | 945 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 46 | 948 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |

## Raw API Count Metadata

| Field | Value |
| --- | --- |
| total_count | 46 |
| existing_arrears_count | 5 |
| ttlock_expired_unpaid_count | 41 |
| config_missing_count | 0 |
| dedupe_dropped_count | 0 |
| duration_ms | 2577 |

## Safety Result

- production D1 write: no
- production migration: no
- production write gate opened: no
- owner directive create called: no
- employee follow-up called: no
- password/token/cookie printed: no
- production cutover: PRODUCTION_NO_GO

# Arrears Current 46 Production Preflight

Generated: 2026-06-01T12:45:33.117Z

This is a production read-only/API preflight report. It does not open the write gate, does not call directive create, and does not write arrears business data.

## Summary

| Field | Value |
| --- | --- |
| owner auth usable | yes |
| owner /api/me status | 200 |
| boss SOT API status | 200 |
| current SOT count | 46 |
| expected count 46 | yes |
| existing_arrears_record count | 5 |
| ttlock_expired_unpaid count | 41 |
| materializable ready count | 46/46 |
| already assigned count | 1 |
| target employee auth usable | yes |
| target employee role | staff |
| write gate | not opened by this preflight |
| production cutover | PRODUCTION_NO_GO |
| preflight result | PASS |

## Blockers

- none

## Task Readiness

| # | Task ID | Room/Bed | Source | Amount | Due date | Stable source_ref | Already assigned | Ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | task-mpgzu9kp-f150e26f | 144 | existing_arrears_record | 50.00 AED | 2026-06-10 | yes | yes | yes |
| 2 | mpedbxgv6w5vg | 219-4014 | existing_arrears_record | 200.00 AED | 2026-05-22 | yes | no | yes |
| 3 | mpa334da3d6kl | 652 | existing_arrears_record | 130.00 AED | 2026-05-20 | yes | no | yes |
| 4 | mp6skg3113uw5 | 835 | existing_arrears_record | 100.00 AED | 2026-05-20 | yes | no | yes |
| 5 | mp6skg3lvl0rf | 835 | existing_arrears_record | 200.00 AED | 2026-05-20 | yes | no | yes |
| 6 | ttlock-expired-139777220 | 112 | ttlock_expired_unpaid | 770.00 AED | 2026-06-01 | yes | no | yes |
| 7 | ttlock-expired-139777824 | 113 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 8 | ttlock-expired-139778918 | 125 | ttlock_expired_unpaid | 700.00 AED | 2026-05-31 | yes | no | yes |
| 9 | ttlock-expired-139779656 | 138 | ttlock_expired_unpaid | 770.00 AED | 2026-06-01 | yes | no | yes |
| 10 | ttlock-expired-139781714 | 224 | ttlock_expired_unpaid | 800.00 AED | 2026-06-01 | yes | no | yes |
| 11 | ttlock-expired-139783454 | 324 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 12 | ttlock-expired-139783492 | 325 | ttlock_expired_unpaid | 630.00 AED | 2026-05-07 | yes | no | yes |
| 13 | ttlock-expired-139783752 | 329 | ttlock_expired_unpaid | 630.00 AED | 2026-05-30 | yes | no | yes |
| 14 | ttlock-expired-139783892 | 332 | ttlock_expired_unpaid | 780.00 AED | 2026-06-01 | yes | no | yes |
| 15 | ttlock-expired-146842036 | 4210 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 16 | ttlock-expired-146842038 | 423 | ttlock_expired_unpaid | 630.00 AED | 2026-06-01 | yes | no | yes |
| 17 | ttlock-expired-146842048 | 429 | ttlock_expired_unpaid | 630.00 AED | 2026-06-01 | yes | no | yes |
| 18 | ttlock-expired-146842056 | 434 | ttlock_expired_unpaid | 780.00 AED | 2026-06-01 | yes | no | yes |
| 19 | ttlock-expired-139869534 | 612 | ttlock_expired_unpaid | 730.00 AED | 2026-06-01 | yes | no | yes |
| 20 | ttlock-expired-139869616 | 621 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 21 | ttlock-expired-139870038 | 627 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 22 | ttlock-expired-139870392 | 635 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 23 | ttlock-expired-139870474 | 636 | ttlock_expired_unpaid | 730.00 AED | 2026-05-28 | yes | no | yes |
| 24 | ttlock-expired-139874346 | 725 | ttlock_expired_unpaid | 680.00 AED | 2026-06-01 | yes | no | yes |
| 25 | ttlock-expired-139874396 | 726 | ttlock_expired_unpaid | 730.00 AED | 2026-05-31 | yes | no | yes |
| 26 | ttlock-expired-139875536 | 752 | ttlock_expired_unpaid | 730.00 AED | 2026-06-01 | yes | no | yes |
| 27 | ttlock-expired-139875782 | 754 | ttlock_expired_unpaid | 730.00 AED | 2026-06-01 | yes | no | yes |
| 28 | ttlock-expired-119983794 | 811 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 29 | ttlock-expired-119983716 | 813 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 30 | ttlock-expired-120334884 | 821 | ttlock_expired_unpaid | 700.00 AED | 2026-05-28 | yes | no | yes |
| 31 | ttlock-expired-120334612 | 826 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 32 | ttlock-expired-117665264 | 834 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 33 | ttlock-expired-129835896 | 836 | ttlock_expired_unpaid | 750.00 AED | 2026-05-27 | yes | no | yes |
| 34 | ttlock-expired-119325960 | 842 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 35 | ttlock-expired-125538050 | 847 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 36 | ttlock-expired-117667658 | 8513 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 37 | ttlock-expired-144974648 | 911 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 38 | ttlock-expired-141887562 | 9114 | ttlock_expired_unpaid | 750.00 AED | 2026-05-31 | yes | no | yes |
| 39 | ttlock-expired-144974914 | 913 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 40 | ttlock-expired-140408268 | 916 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 41 | ttlock-expired-144978192 | 917 | ttlock_expired_unpaid | 700.00 AED | 2026-05-31 | yes | no | yes |
| 42 | ttlock-expired-140408104 | 918 | ttlock_expired_unpaid | 750.00 AED | 2026-05-31 | yes | no | yes |
| 43 | ttlock-expired-144977382 | 938 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 44 | ttlock-expired-140411418 | 942 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |
| 45 | ttlock-expired-150990300 | 945 | ttlock_expired_unpaid | 700.00 AED | 2026-06-01 | yes | no | yes |
| 46 | ttlock-expired-147206702 | 948 | ttlock_expired_unpaid | 750.00 AED | 2026-06-01 | yes | no | yes |

## Raw API Count Metadata

| Field | Value |
| --- | --- |
| total_count | 46 |
| existing_arrears_count | 5 |
| ttlock_expired_unpaid_count | 41 |
| config_missing_count | 0 |
| dedupe_dropped_count | 0 |
| duration_ms | 2186 |

## Safety Result

- production D1 write: no
- production migration: no
- production write gate opened: no
- owner directive create called: no
- employee follow-up called: no
- password/token/cookie printed: no
- production cutover: PRODUCTION_NO_GO

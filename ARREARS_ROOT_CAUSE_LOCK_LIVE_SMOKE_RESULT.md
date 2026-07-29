# Arrears Root Cause Lock Live Smoke Result

Date: 2026-05-30, Asia/Dubai

## Live Smoke Status

Completed with static/read-only checks only.

## Acceptance Checklist

| Check                                       | Result                            |
| ------------------------------------------- | --------------------------------- |
| Pool contains `historical_arrears`          | PASS                              |
| Pool contains `current_due_unpaid`          | PASS                              |
| Pool contains `ttlock_expired_card`         | PASS                              |
| Unknown TTLock amount displays `金额待核对` | PASS                              |
| Overview quick actions absent               | PASS                              |
| Network nav does not wrap                   | PASS via `/index-51` static route |
| Debug fields absent                         | PASS in `renderArrearsPanel`      |

Notes:

- `/index-51.html` is route-normalized to `/owner`; unauthenticated requests redirect to the root portal. The static owner shell is directly verifiable at `/index-51`.
- `/api/me` without authentication returned `401` with `{"code":1001,"message":"unauthenticated"}`.

Production remains `PRODUCTION_NO_GO`.

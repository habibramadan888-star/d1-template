# Bed Transfer Production UI-Only Live Smoke Result

Date: 2026-06-01, Asia/Dubai

Scope: read-only live asset smoke after UI-only deployment.

## Live Checks

Command target:

```text
https://homelink-finance.habibramadan888.workers.dev/employee-v3
```

| Check | Result |
|---|---:|
| `/employee-v3` accessible | PASS |
| `transferFromBed` present | PASS |
| `bedTo` present | PASS |
| `transferDate` present | PASS |
| `transferReason` present | PASS |
| `transferReviewPanel` present | PASS |
| `BED_TRANSFER_WRITE_ENABLED=false` present | PASS |
| `Bed transfer write is not enabled` present | PASS |
| `isBedTransferWriteGated` present | PASS |
| export gate for TF drafts present | PASS |

## Smoke Boundaries

| Boundary | Result |
|---|---|
| Authenticated employee phone smoke | Manual required |
| Bed Transfer save clicked against production | No |
| Production write | No |
| Production migration | No |
| Production D1 execute/write | No |
| Production cutover | `PRODUCTION_NO_GO` |

## Result

Live read-only smoke passed for the deployed UI markers. The `/employee-v3.html` compatibility route redirects to `/employee`; direct asset verification used `/employee-v3`.

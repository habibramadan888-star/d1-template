# Owner Arrears Timeout And Partial Failure Fix

Status: implemented.

| Check | Expected | Result |
| --- | --- | --- |
| infinite loading possible | no | no, loading has bounded status transitions |
| partial data can render | yes | yes, source loads use `Promise.allSettled()` |
| retry works | yes | yes, `retryOwnerOverviewArrears()` starts a new request |
| old abort ignored | yes | yes, stale `loadSeq` exits silently |
| current request failure recoverable | yes | yes, current failure enters retryable error state |

Behavior:

- Loading skeleton renders immediately.
- 3 seconds: slow-loading message appears.
- 10 seconds: current request enters recoverable failure.
- Both sources failed: show “欠款数据读取失败” and retry.
- One source failed: render available source data and show a business warning.
- Technical failure class is logged internally through source status and console warning, not exposed as raw stack/message in the card.

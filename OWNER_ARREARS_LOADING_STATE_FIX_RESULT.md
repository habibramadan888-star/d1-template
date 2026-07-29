# Owner Arrears Loading State Fix Result

Implemented a closed arrears loading state machine:

- `idle`
- `loading`
- `success`
- `empty`
- `error`
- `timeout`

| Check                       | Expected   | Result                                                                       |
| --------------------------- | ---------- | ---------------------------------------------------------------------------- |
| skeleton appears            | <=300ms    | PASS, overview renders shell immediately and starts async load with skeleton |
| loading max                 | <=10s      | PASS, `ARREARS_FETCH_TIMEOUT_MS=10000`                                       |
| 3s slow message             | yes        | PASS, `ARREARS_SLOW_LOADING_MS=3000` shows “仍在读取，请稍候”                |
| timeout visible             | yes        | PASS, timeout state shows “读取超时，请重试”                                 |
| retry button visible        | yes        | PASS, `retryOwnerOverviewArrears()`                                          |
| infinite loading possible   | must be no | PASS, latest abort/timeout closes to retryable state                         |
| overview blocked by arrears | must be no | PASS, arrears section loads after overview HTML is rendered                  |

Abort handling:

- Stale request aborts are ignored via `arrearsLoadSeq`.
- Latest request aborts close to a retryable state instead of showing permanent skeleton.
- API errors are isolated to the arrears module.

No D1 write, migration, dashboard formula, financial formula, or business write was performed.

# TEST-STABILITY-001 Diagnostic Logging

Generated: 2026-05-25, Asia/Dubai

The readiness helper now reports the following on failure:

| Diagnostic               | Status                                | Notes                                                                     |
| ------------------------ | ------------------------------------- | ------------------------------------------------------------------------- |
| Selected port            | Added                                 | Passed through `diagnostics.port`.                                        |
| Base URL                 | Existing                              | Included in the main readiness failure message.                           |
| Worker command           | Added                                 | The affected test reports `wrangler dev --local --port <port>`.           |
| `APP_ENV`                | Added through non-secret vars summary | Values are summarized only for explicit test vars.                        |
| Feature flag values      | Added through non-secret vars summary | Values such as `ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING` are safe to print. |
| Last stdout lines        | Added                                 | Sanitized and tailed.                                                     |
| Last stderr lines        | Added                                 | Sanitized and tailed.                                                     |
| Readiness attempts count | Added                                 | Attempts are counted at 500ms intervals.                                  |
| Elapsed ms               | Added                                 | Included in timeout error.                                                |
| Child process exit code  | Added                                 | Includes PID, `exitCode`, and `signalCode`.                               |
| Secret redaction         | Preserved                             | Uses `sanitizeLog()` and hides secret-like variable names.                |

This diagnostic logging is only emitted on readiness failure. Passing test output remains concise.

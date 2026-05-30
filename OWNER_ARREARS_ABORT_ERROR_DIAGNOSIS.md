# Owner Arrears Abort Error Diagnosis

Production cutover remains `PRODUCTION_NO_GO`.

| Cause Candidate                 | Finding                                                                  | Result                          |
| ------------------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| Which fetch aborts              | `/api/arrears/followup/tasks?limit=20`, fallback `/api/arrears?limit=20` | Arrears first-page fetch        |
| AbortController creation        | `apiFetchWithTimeout()`                                                  | Timeout controller              |
| Tab switching                   | Not the primary cause                                                    | No explicit tab abort was found |
| Duplicate fetch                 | Guard existed but stale async hydration needed sequencing                | Fixed                           |
| Timeout                         | Primary cause                                                            | Classified with `TimeoutError`  |
| Component rerender / mount      | No framework remount; plain SPA                                          | Not primary                     |
| Stale controller                | Timeout abort had no user-safe classification                            | Fixed                           |
| Promise race                    | No separate Promise.race found                                           | Not primary                     |
| Auth guard                      | Not indicated by code path                                               | Not primary                     |
| Normal abort shown as red error | yes                                                                      | Fixed                           |

## Conclusion

The user-facing error was caused by timeout/abort being handled like a hard API failure. A slow or replaced request should keep the skeleton/cache and should not display `signal is aborted without reason`.

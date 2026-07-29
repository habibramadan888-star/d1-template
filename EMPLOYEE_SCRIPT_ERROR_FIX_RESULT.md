# Employee Script Error Fix Result

| Error Source                                              | File                                    | Cause                                                            | Fix                                                                                                       | Verified |
| --------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| Global error toast displayed raw `Script error.`          | `deploy-worker/public/employee-v3.html` | Raw anonymous errors were shown as `页面脚本错误：Script error.` | Replaced raw toast with `employeeRuntimeErrorInfo`, sanitized messages, and anonymous-script suppression. | yes      |
| Unhandled promise rejection toast exposed raw reason text | `deploy-worker/public/employee-v3.html` | Raw rejection message could be noisy and inconsistent.           | Replaced with a short `操作失败，请重试` user message plus safe console diagnostics.                      | yes      |

Validation: `npm run test:employee-script-error` passed.

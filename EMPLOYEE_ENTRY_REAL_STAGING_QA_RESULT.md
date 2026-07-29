# Employee Entry Real Staging QA Result

Generated: 2026-05-25T12:12:58.675Z

Result: `PASS`

| Test                     | Result | Evidence                                         | Notes                                                         |
| ------------------------ | ------ | ------------------------------------------------ | ------------------------------------------------------------- |
| valid employee entry     | PASS   | status=200; adapter=DRAFT_READY                  | adapter pre-validation active; legacy staging write continued |
| invalid 3 decimal amount | PASS   | status=422; code=EMPLOYEE_ENTRY_ADAPTER_REJECTED | no sessions or transactions written                           |
| empty amount rejected    | PASS   | status=422; code=EMPLOYEE_ENTRY_ADAPTER_REJECTED | no sessions or transactions written                           |
| owner/admin denied       | PASS   | status=403; code=FORBIDDEN                       | manager cookie denied before employee entry write             |

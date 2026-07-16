# QA Acceptance QA-20260716-F62E35B7

- Mode: quick
- Status: AUTOMATION_PASS
- Manual Employee status: DELIVERY_FAILED
- QA_RUN_STATUS: AUTOMATION_PASS
- MANUAL_EMPLOYEE_STATUS: DELIVERY_FAILED
- MANUAL_EMPLOYEE_DELIVERY_RESULT: FAILED_CROSS_BROWSER_STATE
- Artifact SHA-256: `142c8131ea3819d9508aa4b901365b3d05cacff1482c0fc65f013ba0557ce194`
- Artifact commit: `96bea977e18db8ca477f9729415d19a0a6123801`
- QA Worker deployment: `35e355d9-2222-446a-aef8-d1baaa9f3d98`
- Scenario count: 16
- Employee records: 16
- Header count: 16
- Sticky count: 16
- DOM card count: 16
- Reloaded card count: 16
- Validation Passed: 16/16
- Stable Entry IDs: 16 unique and run-scoped
- Stable Session IDs: 16 unique and run-scoped
- Paid Bed Transfer cash: AED 50
- Paid Bed Transfer bank: AED 50
- Ledger Transfer total: AED 100
- Ledger Outstanding: AED 150
- Ledger Arrears Opened: AED 150
- Ledger Arrears Repaid: AED 70
- Cash Received: AED 1,620
- Bank Received: AED 880
- Total Received: AED 2,500
- Expenses: AED 799
- Net Funds: AED 1,701
- Cash Net: AED 1,421
- Bank Net: AED 280
- Deposit Included: AED 200
- Archive reads: 1
- `entries_json` parses: 1
- TTLock external calls: 0
- Formal write count: 0
- QA formal Session rows: 0
- Current Session screenshot: `employee-current-session.png`
- Ledger screenshot: `employee-ledger-preview.png`
- Upload: not executed
- Owner manual acceptance: pending
- Final reconciliation: pending
- Production Worker: `84ee2023-f550-47e0-9e4f-3caa161a3431`, unchanged
- Production business data changed: no

## Verification

- QA/Quick/Full/Recovery/seven-event/Ledger/aggregate/resumable/idempotency group: 73/73 passed
- Owner History/Finance/Arrears/Today Todo/Auth/TTLock/Exit Event group: 73/73 passed
- Exit Event: 7/7 passed; OAuth, lock list, identity card and TTLock external calls all zero
- QA acceptance local platform: PASS, formal write 0
- Golden Session isolated harness: PASS, 16 scenarios, retry writes 0, duplicate anchors 0, TTLock external calls 0
- Syntax: 678 files passed
- Secret hygiene: passed
- Wrangler dry-run and artifact reproducibility: passed

No reviewer button was clicked. The Run is intentionally paused at the manual
Employee acceptance gate. The first manual handoff was rejected because the
user's independent browser preserved its personal one-record draft instead of
loading the server QA Run. The automation evidence remains valid and preserved;
this Run was never uploaded or manually accepted.

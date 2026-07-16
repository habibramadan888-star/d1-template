# QA Acceptance QA-20260716-6D6F097B

- Mode: quick
- Status: AUTOMATION_PASS
- Artifact SHA-256: `b294f7a323496db8027c1b32e5ee7eab2d96d92ced9c9ad5e867e8b56b084b17`
- Artifact commit: `d99f34d6ecf1f856d432c925cb8e404fc981d020`
- QA Worker deployment: `a57380c5-2e11-43e1-bcad-f25af67fa26c` at 100% QA traffic
- Scenario count: 16
- Employee record count: 16
- Aggregate validation: 16 passed, 0 failed
- Formal write count: 0
- TTLock external calls: 0
- Archive reads: 1
- `entries_json` parses: 1
- Employee Header count: 16
- Employee Sticky count: 16
- Employee DOM card count: 16
- Validation Passed cards: 16
- Bank cards present: yes
- Stable Entry IDs: 16 unique and run-scoped
- Stable Session IDs: 16 unique and run-scoped
- Expected finance oracle: cash received 1620; bank received 880; total received 2500; cash out 199; bank out 600; total expenses 799; net funds 1701; cash net 1421; bank net 280; outstanding 150; arrears opened 150; arrears repaid 70; deposit included 200; deposit refund 200; expense 599; Bed Transfer fee 100; rent income 2130
- Current Session screenshot: `employee-current-session.png`
- Ledger screenshot: `employee-ledger-preview.png`
- Preview renderer: formal `HOMELINK LEDGER`
- Expected paid Bed Transfer fee: AED 50 cash and AED 50 bank
- Observed Current Session cards: AED 50 cash and AED 50 bank
- Observed Ledger defect: both paid Bed Transfers render as `transfer waived`; Breakdown renders `Transfer 0`
- Observed Ledger Outstanding/Arrears Opened: 70/70 versus the full oracle 150/150
- Employee manual acceptance: rejected with findings
- MANUAL_EMPLOYEE_STATUS: REJECTED_WITH_FINDINGS
- Remote cleanup status: COMPLETED
- Upload: not executed
- Owner manual acceptance: pending
- Final reconciliation: pending
- Production Worker version: `84ee2023-f550-47e0-9e4f-3caa161a3431`, unchanged
- Production business data changed: no

The QA Run remains at `AUTOMATION_PASS`. No reviewer button was clicked. The paid
Bed Transfer Ledger mismatch is preserved as an explicit manual-review finding;
it is not hidden by the passing aggregate validation result.

This Run was rejected for Employee acceptance. It must not enter
`MANUAL_EMPLOYEE_ACCEPTED`, `UPLOAD_PASS`, `MANUAL_OWNER_ACCEPTED`, or
`FINAL_ACCEPTED`. Its evidence and artifact manifest remain immutable.

## Verification

- QA acceptance, seven-event, aggregate, recovery, resumable and idempotency tests: 54/54 passed
- Isolated golden-session harness: passed, 16 scenarios, 0 retry writes, 0 duplicate anchors, 0 TTLock external calls
- Owner History, Finance, Arrears, Today Todo, auth and TTLock regression group: 72/73 passed
- Exit Event business protection assertions: 6/7 passed; the isolated snapshot-policy test harness failed before its assertions because its extracted function did not provide the existing `cleanText` dependency
- Syntax: 678 files passed
- Secret hygiene: passed
- Git diff check: passed before evidence staging
- Production QA page: 404
- Production QA API without authentication: bounded JSON 401

# QA Acceptance QA-20260716-2830578C

- TASK_STATUS: AUTOMATION_FAILED
- QA_RUN_STATUS: AUTOMATION_FAILED
- MANUAL_EMPLOYEE_STATUS: REJECTED_WITH_FINDINGS
- Mode: quick
- Artifact SHA-256: `d1e68b40f95728f6dce9078d3c1b4f1f1f99ce18c4180ad703c6c01aa54ac91d`
- Artifact commit: `948544aa23de3c7ef7f42cfeee3326327ec46b30`
- QA Worker deployment: `d3a04b67-1616-4ffa-8d83-722b8374d212`
- Delivery contract: `SERVER_PERSISTED_QA_RUN_V1`
- Server draft count: 16
- Browser A memory count: 16
- Browser A QA storage count: 16
- Header count: 16
- Sticky count: 16
- DOM card count: 16
- Three reload counts: 16, 16, 16
- Browser B independent DOM count: 16
- Browser B independent QA storage count: 16
- Cross-browser delivery count: 16/16 in both browsers
- Real Employee Validate Session result: 14 passed, 2 failed
- Record #5: `LEGACY_ARREARS_CANONICAL_REF_INVALID`
- Record #11: `LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING` (`note`)
- Prior reported 16/16 was a stale/pre-recorded validation-state false positive
- Stable Entry IDs: 16 unique and Run-scoped
- Stable Session IDs: 16 unique and Run-scoped
- Production Employee draft `#622` was not part of this QA Run and is not claimed as verified by this Run
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
- Missing Run fail-closed result: one session-level message, zero QA cards, personal draft unchanged
- Browser console errors: 0 in Browser A and Browser B
- Formal write count: 0
- QA formal Session rows: 0
- Upload: not executed
- Employee acceptance button: not clicked
- Owner acceptance button: not clicked
- Owner manual acceptance: pending
- Final reconciliation: pending
- Production Worker: `84ee2023-f550-47e0-9e4f-3caa161a3431`, unchanged at 100%
- Production traffic changed: no
- Production business data changed: no
- Production migration applied: no

## Verification

- QA/Quick/Full/Recovery/seven-event/Ledger/aggregate/resumable/idempotency and current Owner/Auth/TTLock/Exit groups: 209/209 passed.
- Golden Session isolated harness: PASS, 16 scenarios, retry writes 0, duplicate anchors 0, TTLock external calls 0.
- QA acceptance local platform: PASS, formal write 0.
- Cross-browser and namespace isolation tests: 4/4 passed.
- Syntax: 679 files passed.
- Secret hygiene: passed.
- Wrangler dry-run and artifact reproducibility: passed.

The Run is permanently rejected with real-browser validation findings. The
cross-browser delivery itself succeeded (Header, Sticky, DOM, memory, and QA
storage each showed 16), but the live Employee aggregate validation exposed two
fixture/transport-integrity failures. No reviewer button or Upload Session
button was clicked, and formal write count remained zero.

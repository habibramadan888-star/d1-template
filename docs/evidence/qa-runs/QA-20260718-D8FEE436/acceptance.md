# QA Acceptance QA-20260718-D8FEE436

- Mode: full
- Status: REJECTED_CROSS_AUTH_REDIRECT
- Real Employee Validate Session: 41/41 passed
- Automation-only scenarios: 5 (excluded from Employee upload records)
- Employee manual acceptance: rejected because the pre-auth Employee deep link lost its Run identity
- Upload: not executed
- Owner manual acceptance: pending
- Final reconciliation: pending
- Formal write count: 0
- TTLock external calls: 0
- Settled refresh parity: 10/10 at AUTHENTICATED and 41 cards
- Production business data changed: no
- Rejection finding: unauthenticated `/employee?qa_run_id=QA-20260718-D8FEE436#entry` redirected to `/`, so the browser displayed a false empty Current Session while all 41 server records remained intact.

# Handover Real Staging QA Result

Generated: 2026-05-25T12:12:58.676Z

Result: `PASS`

| Test                            | Result | Evidence                                  | Notes                                        |
| ------------------------------- | ------ | ----------------------------------------- | -------------------------------------------- |
| employee valid staging handover | PASS   | status=201; statusText=ACCEPTED           | staging handover tables should be written    |
| same idempotency key replay     | PASS   | status=200; statusText=IDEMPOTENT_REPLAY  | no duplicate staging commit rows             |
| frontend total tamper rejected  | PASS   | status=422; code=FRONTEND_TOTALS_MISMATCH | frontend totals are not accounting authority |
| voided row rejected             | PASS   | status=422; code=VOIDED_REJECTED          | voided rows cannot be committed              |
| owner/admin submit rejected     | PASS   | status=403; code=FORBIDDEN                | manager cookie denied for employee handover  |

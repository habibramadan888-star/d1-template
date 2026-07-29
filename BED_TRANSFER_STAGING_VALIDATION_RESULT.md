# Bed Transfer Staging Validation Result

Date: 2026-06-01
Status: `PASS`

| Validation | Expected | Actual | Result |
|---|---|---|---|
| from_bed not empty | validate | `STG-valid` | PASS |
| to_bed not empty | validate | `STG-transfer-to-20260601185154` | PASS |
| from_bed != to_bed | validate | different values | PASS |
| from_bed has active tenant | validate | staging source row found for `Staging QA Tenant` | PASS |
| to_bed available | validate | generated QA target bed had no active row | PASS |
| deposit readable | validate | `0 fils` fixture deposit context read | PASS |
| rent period readable | validate | `2026-06-01` to `2026-06-02` | PASS |
| arrears readable | validate | no open arrears found; carry-over set to `0 fils` | PASS |
| old TTLock ref readable | validate | `STG-CID-1779711007144-1e4a78-valid` | PASS |
| rent difference review flag | validate if applicable | `0 fils` rent difference | PASS |
| validation summary | generated | save status `pending_review` because new TTLock requires review | PASS |

No production write was executed.

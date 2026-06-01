# Bed Transfer Employee Save Path Owner Visibility Result

Date: 2026-06-01, Asia/Dubai

Result: `PASS`

Owner visibility was verified through `GET /api/owner/bed-transfers?status=pending_review&limit=50`.

| Field | Expected | Actual | Result |
|---|---|---|---|
| transfer visible | yes | yes | PASS |
| transfer_id | `bt-20260601-103-111-89ba905e` | visible | PASS |
| from_bed | `103` | visible | PASS |
| to_bed | `111` | visible | PASS |
| transfer_date | `2026-06-01` | visible | PASS |
| status | `pending_review` | visible | PASS |
| operator | employee smoke actor | visible in event row/API payload | PASS |
| reason | `Management adjustment` | visible | PASS |
| note | production smoke note | visible | PASS |
| audit id | present | present | PASS |
| trace id | present | present | PASS |
| review required | yes | yes | PASS |

The owner visibility path is read-only. It does not approve, reject, or mutate the Bed Transfer request.

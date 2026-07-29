# Arrears WhatsApp Baseline Live Smoke Result

Generated: 2026-05-31 16:12:54 +04:00

## Live Target

- URL: `https://homelink-finance.habibramadan888.workers.dev`
- Worker Version ID: `990e89ac-44b5-450a-8d6d-9aee03e88168`

## Read-Only Smoke Checks

| Check | Result | Evidence |
|---|---:|---|
| Worker reachable | PASS | `/api/me` returned `401` without auth, as expected |
| Owner page route reachable | PASS | `/index-51.html` returned `200`; unauthenticated route serves login/portal shell |
| Deployed owner JS reachable | PASS | `/index-51-main.js` fetched successfully |
| Final WhatsApp builder deployed | PASS | Live JS contains `buildArrearsWhatsAppText`, `dedupeArrearsExportRows`, `ownerArrearsExportRows` |
| Selected-or-filtered export contract deployed | PASS | Live JS contains `ownerArrearsExportRows()` |
| Searchable `125` / `219` / `4014` | PASS | Live JS harness generated continuous identifiers |
| Forbidden `ttlock_card` / `rent` / `deposit` in generated export | PASS | Live generated sample text did not contain these terms |
| Mojibake replacement character in generated export | PASS | Live generated sample text did not contain `U+FFFD` |
| Duplicate sample export | PASS | Duplicate row sample was deduplicated |
| Business write | PASS | None executed |

## Live Generated Sample

```text
Due 5/8 | 2 overdue
---
【1-125】
125  6d*  D200  0525

【2-219】
219  23d*  D200  0508

【4-014】
4014  Due  D200  0808
```

## Safety

- D1 write: No
- D1 migration: No
- D1 export/import/execute: No
- Business write: No
- Production cutover: `PRODUCTION_NO_GO`


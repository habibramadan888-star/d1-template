# Bed Transfer Live Save Final Deploy Result

Date: 2026-06-01
Worker: homelink-finance
URL: https://homelink-finance.habibramadan888.workers.dev
Version ID: cc618def-9956-4489-860f-a18589ff362b

## Deployed Scope

- Bed Transfer save handler schema-tolerant insert fix.
- Review flags non-blocking metadata.
- Dedicated Step 8 Bed Transfer summary.
- Fee ledger behavior.
- Employee UI TTLock phone sanitizer.
- Bed Transfer failure toast reason copy.

## Explicitly Not Deployed

- No occupancy mutation.
- No deposit mutation.
- No arrears clearing.
- No TTLock mutation.
- No owner approval workflow.
- No production cutover.

Deployment command:

```powershell
npx wrangler deploy --config wrangler.toml
```

Wrangler uploaded `/employee-v3.html` and `/index-51-main.js`.

Production cutover remains PRODUCTION_NO_GO.

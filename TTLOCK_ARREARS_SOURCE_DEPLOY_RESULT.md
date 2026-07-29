# TTLock Arrears Source Deploy Result

Status: deployed to default production Worker.

Deploy command:

```bash
cd deploy-worker
npx wrangler deploy --config wrangler.toml
```

Deploy output summary:

| Item | Result |
|---|---|
| Wrangler version | 4.94.0 |
| Uploaded static assets | 1 |
| Uploaded file | `/index-51-main.js` |
| Worker URL | `https://homelink-finance.habibramadan888.workers.dev` |
| Version ID | `5a23e751-30e8-4c8a-9990-eece48bd1010` |

Preflight:

| Command | Result |
|---|---|
| `npm run build:embedded:dry-run` | PASS |
| `npm run verify:embedded-worker` | PASS |
| `npm run audit:worker-drift` | PASS command; `WORKER_DRIFT_CRITICAL_MISMATCHES=0` |

Allowed scope confirmation:

- Read-only TTLock source aggregation: deployed.
- Owner overview TTLock display fix: deployed.
- D1 write: no.
- Migration: no.
- D1 export/import/execute: no.
- Employee entry write: no.
- Handover submit: no.
- Void/delete: no.
- Settings change: no.
- Dashboard calculation change: no.
- Financial formula change: no.
- Secret print: no.

Production cutover remains `PRODUCTION_NO_GO`.

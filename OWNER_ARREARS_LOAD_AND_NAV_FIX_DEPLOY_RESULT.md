# Owner Arrears Load And Nav Fix Deploy Result

Status: deployed to default production Worker.

Deploy command:

```bash
cd deploy-worker
npx wrangler deploy --config wrangler.toml
```

Deploy output summary:

| Item | Result |
| --- | --- |
| Wrangler version | 4.94.0 |
| Uploaded static assets | 3 |
| Uploaded files | `/index.html`, `/index-51.html`, `/index-51-main.js` |
| Worker URL | `https://homelink-finance.habibramadan888.workers.dev` |
| Version ID | `94a98102-43c8-4d6f-86d5-29311577c026` |

Preflight results:

| Command | Result |
| --- | --- |
| `npm run build:embedded:dry-run` | PASS |
| `npm run verify:embedded-worker` | PASS |
| `npm run audit:worker-drift` | PASS command, `WORKER_DRIFT_CRITICAL_MISMATCHES=0` |

Scope confirmation:

- Static owner UI fix: deployed.
- Read-only arrears aggregation fix: deployed.
- D1 write: no.
- Migration: no.
- D1 export/import/execute: no.
- Employee entry write: no.
- Handover submit: no.
- Void/delete: no.
- Settings change: no.
- Dashboard calculation change: no.
- Financial formula change: no.

Production cutover remains `PRODUCTION_NO_GO`.

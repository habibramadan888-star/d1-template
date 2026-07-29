# Owner Arrears Overview Loading Deploy Result

Status: preflight passed; production static UI deploy approved within read-only scope.

Preflight results:

| Check | Result | Notes |
| --- | --- | --- |
| `npm run build:embedded:dry-run` | PASS | `EMBEDDED_WORKER_CURRENT_MISSING=0`, `EMBEDDED_WORKER_GENERATED_MISSING=0` |
| `npm run verify:embedded-worker` | PASS | `EMBEDDED_WORKER_MISSING_CRITICAL=0` |
| `npm run audit:worker-drift` | PASS with existing non-critical drift | `WORKER_DRIFT_CRITICAL_MISMATCHES=0`; route mismatches remain tracked as existing audit output |

Deploy result:

| Command | Result | Notes |
| --- | --- | --- |
| `npx wrangler --version` | PASS | `4.94.0` |
| `npx wrangler deploy --config wrangler.toml` | PASS | Uploaded `/index.html`, `/index-51.html`, `/index-51-main.js`; Worker URL `https://homelink-finance.habibramadan888.workers.dev`; version `a9640615-e0b3-4dca-9ccb-660accd4c4cd` |

Deploy warning:

- Wrangler warned that multiple environments exist and no explicit environment was specified. This deploy intentionally targeted the top-level/default production worker, matching the requested production scope.

Allowed deploy scope:

- Static UI fix
- Read-only aggregation/loading fix
- No D1 write
- No migration
- No D1 export/import/execute
- No employee entry write
- No handover submit
- No void/delete
- No settings change
- No dashboard calculation change
- No financial formula change

Production cutover remains `PRODUCTION_NO_GO`.

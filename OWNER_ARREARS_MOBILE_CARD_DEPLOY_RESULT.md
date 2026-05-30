# Owner Arrears Mobile Card Deploy Result

Date: 2026-05-31, Asia/Dubai

## Deploy Decision

Production deployment was executed for the Homelink Finance Worker default environment after predeploy verification passed.

## Command

```bash
cd deploy-worker
npx wrangler deploy --config wrangler.toml
```

## Wrangler Result

| Item                   | Result                                                 |
| ---------------------- | ------------------------------------------------------ |
| Worker                 | `homelink-finance`                                     |
| URL                    | `https://homelink-finance.habibramadan888.workers.dev` |
| Version ID             | `b695662a-9c47-477d-aa4c-a6a6fb1fdfac`                 |
| Static assets read     | 10 files                                               |
| Static assets uploaded | 2 files                                                |

Uploaded assets:

| Asset               |
| ------------------- |
| `/index-51.html`    |
| `/index-51-main.js` |

Wrangler also reported the existing warning that multiple environments are defined in `wrangler.toml` and no explicit `--env` was provided. This deployment intentionally targeted the default production Worker, per task instruction.

## Scope Confirmation

This deployment published the owner arrears mobile card UI fix and related read-only static UI assets only.

| Operation                    | Executed |
| ---------------------------- | -------: |
| D1 write                     |       no |
| D1 migration                 |       no |
| D1 export/import/execute     |       no |
| employee entry write         |       no |
| handover submit              |       no |
| void/delete                  |       no |
| settings change              |       no |
| dashboard calculation change |       no |
| financial formula change     |       no |
| commercial launch GO         |       no |

## Production Cutover

`PRODUCTION_NO_GO` remains required.

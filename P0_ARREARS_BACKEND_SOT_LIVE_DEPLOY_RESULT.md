# P0 Arrears Backend SOT Live Deploy Result

| Item                   | Result                                                 |
| ---------------------- | ------------------------------------------------------ |
| deploy executed        | yes                                                    |
| Worker                 | `homelink-finance`                                     |
| Worker URL             | `https://homelink-finance.habibramadan888.workers.dev` |
| Wrangler version       | `4.94.0`                                               |
| Worker version id      | `58c0228a-a2e5-4040-8fcc-fa5eeee43860`                 |
| Uploaded static assets | `/index-51-main.js` only                               |
| D1 write               | no                                                     |
| migration              | no                                                     |
| business write         | no                                                     |
| production cutover     | `PRODUCTION_NO_GO`                                     |

## Deploy Command

`npx wrangler deploy --config wrangler.toml`

Wrangler emitted a warning that multiple environments exist and no `--env` was specified. This intentionally targeted the top-level production Worker, matching the task request.

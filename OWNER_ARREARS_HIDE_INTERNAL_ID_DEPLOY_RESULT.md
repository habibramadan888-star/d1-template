# OWNER_ARREARS_HIDE_INTERNAL_ID_DEPLOY_RESULT

## Deployment

Production static UI deployment was executed for the Homelink Finance Worker.

```text
Command: npx wrangler deploy --config wrangler.toml
Directory: deploy-worker
Wrangler: 4.94.0
Uploaded asset: /index-51-main.js
Worker: homelink-finance
URL: https://homelink-finance.habibramadan888.workers.dev
Version ID: f0c05c5a-acc6-4b16-a2ff-4d47a1b91e07
```

## Preflight

| Check                            | Result                                              |
| -------------------------------- | --------------------------------------------------- |
| `npm run build:embedded:dry-run` | PASS                                                |
| `npm run verify:embedded-worker` | PASS                                                |
| `npm run audit:worker-drift`     | critical mismatches 0; route mismatches 23 existing |
| D1 write                         | no                                                  |
| migration                        | no                                                  |
| business write                   | no                                                  |
| financial formula change         | no                                                  |

## Notes

Wrangler warned that multiple environments exist and no env was specified. This deployment intentionally targeted the top-level production Worker, matching the task request for the default Homelink Finance Worker.

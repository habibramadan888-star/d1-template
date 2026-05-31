# Arrears Directive Production Worker Route Deploy Result

Timestamp: 2026-05-31T18:05:00Z

## Deploy Summary

| Item | Result |
|---|---|
| deploy executed | yes |
| Worker | homelink-finance |
| Worker version id | 86365492-e47e-499a-95ee-960b46acb976 |
| production URL | https://homelink-finance.habibramadan888.workers.dev |
| write gate | off |
| D1 business write | no |
| migration | no |
| owner directive create | no |
| employee follow-up | no |
| production cutover | PRODUCTION_NO_GO |

## Deployment Command

```bash
npx wrangler deploy --config wrangler.toml
```

## Deployment Scope

Allowed scope deployed:

- `POST /api/boss/arrears/directives`
- `GET /api/employee/arrears/directives`
- `POST /api/employee/arrears/directives/:id/followup`
- write-gated behavior
- readonly_admin write rejection
- masked auth compatibility already committed

Explicitly not performed:

- no write gate enable
- no production D1 execute/export/import
- no production migration
- no production smoke
- no ttlock smoke
- no financial formula change
- no dashboard calculation change

## Wrangler Output Summary

| Output | Value |
|---|---|
| assets read | 10 |
| assets uploaded | 2 |
| uploaded assets | /portal.html, /index-51-main.js |
| Worker uploaded | homelink-finance |
| current version id | 86365492-e47e-499a-95ee-960b46acb976 |

Note: `portal.html` was uploaded by Wrangler as an asset diff, but this task did not edit `portal.html`.

# Staging Secret Setup Result

Scope: staging environment only. Secret values are intentionally omitted.

Command: `npx wrangler secret bulk --env staging --config deploy-worker/wrangler.toml`

| Secret                      | Env     | Set | Value Logged | Production Touched | Notes                                                     |
| --------------------------- | ------- | --- | ------------ | ------------------ | --------------------------------------------------------- |
| `JWT_SECRET`                | staging | yes | no           | no                 | Set from ignored local material via stdin; value omitted. |
| `PW_SALT`                   | staging | yes | no           | no                 | Set from ignored local material via stdin; value omitted. |
| `DATA_ENCRYPTION_KEY`       | staging | yes | no           | no                 | Set from ignored local material via stdin; value omitted. |
| `MANAGER_PW_HASH`           | staging | yes | no           | no                 | Set from ignored local material via stdin; value omitted. |
| `STAFF_PW_HASH`             | staging | yes | no           | no                 | Set from ignored local material via stdin; value omitted. |
| `EMPLOYEE_STAGING_PASSWORD` | staging | yes | no           | no                 | Set from ignored local material via stdin; value omitted. |
| `OWNER_STAGING_PASSWORD`    | staging | yes | no           | no                 | Set from ignored local material via stdin; value omitted. |
| `MANAGER_STAGING_PASSWORD`  | staging | yes | no           | no                 | Set from ignored local material via stdin; value omitted. |
| `USER_ACCOUNTS`             | staging | yes | no           | no                 | Set from ignored local material via stdin; value omitted. |

Wrangler exit code: 0

Production deploy: no
Production secret touched: no
Default environment secret touched: no
Secret values logged: no
Secret values committed: no

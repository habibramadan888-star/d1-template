# Staging QA Manual Required

Generated: 2026-05-25T03:42:25+04:00

P0-001L cannot execute real staging writes from committed repo information alone.

## Missing Required Inputs

| Required Input                                               | Why Required                                              | Safe Delivery Method                                       |
| ------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------- |
| Staging Worker URL                                           | Needed to target the correct non-production API           | Provide in ignored local env or command line               |
| Staging Worker name                                          | Confirms target is not production                         | Human-reviewed Cloudflare dashboard/config note            |
| Staging D1 database name/id                                  | Prevents accidental production data mutation              | Human-reviewed Cloudflare D1 target                        |
| Staging D1 backup/export evidence                            | Required before any write test                            | Screenshot/path/command evidence, not committed secret     |
| Staging rollback procedure                                   | Required before feature-flag write test                   | Human-reviewed rollback steps                              |
| `APP_ENV=staging` confirmation                               | Required for adapter activation safety                    | Cloudflare variable check                                  |
| `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true` confirmation | Required for adapter path QA                              | Cloudflare variable check                                  |
| Staging employee test account                                | Required for authenticated employee submit                | Secure channel or ignored local env                        |
| Staging owner/admin test account                             | Required for denial and dashboard checks                  | Secure channel or ignored local env                        |
| Staging entrypoint confirmation                              | Required because source and embedded artifacts can differ | Human confirms `wrangler.toml` or `wrangler.embedded.toml` |

## Do Not Proceed With Real Staging Writes Until

1. The staging target is proven not to be production.
2. Backup and rollback are confirmed.
3. Employee and owner/admin credentials are available through non-committed secrets.
4. Feature flag behavior is confirmed in staging.
5. A human explicitly approves the write test command.

## Safe Command State

`npm run qa:employee-entry-staging` defaults to dry-run and should return `MANUAL_REQUIRED` until the above inputs are supplied.

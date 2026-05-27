# Internal QA 005B Unified Login Live Smoke Result

Date: 2026-05-28

## Scope

Read-only live smoke after deploying the unified login static route to the `homelink-finance` Worker.

This smoke did not perform employee entry writes, handover submits, void/delete actions, settings changes, migrations, D1 export/import/execute, or any D1 write.

## Results

| Check                          | Expected                       | Actual                                     | Result | Notes                                                   |
| ------------------------------ | ------------------------------ | ------------------------------------------ | ------ | ------------------------------------------------------- |
| Open unified login             | HTTP 200 `text/html`           | HTTP 200 `text/html`                       | PASS   | Page contains Homelink login content.                   |
| Unified login not API fallback | Not fallback text              | Fallback text absent                       | PASS   | No longer returns `Homelink Finance API is running...`. |
| Employee page still opens      | HTTP 200 `text/html`           | HTTP 200 `text/html`                       | PASS   | `/employee-v3.html` remains available.                  |
| Owner page still opens         | HTTP 200 `text/html`           | HTTP 200 `text/html`                       | PASS   | `/` remains available.                                  |
| `/api/me` unauthenticated      | HTTP 401                       | HTTP 401 `{"error":"unauthenticated"}`     | PASS   | Backend authority preserved.                            |
| Wrong login                    | HTTP 401 `invalid_credentials` | HTTP 401 `{"error":"invalid_credentials"}` | PASS   | Used fake invalid credentials only.                     |

## Safety Confirmation

| Item                              | Result             |
| --------------------------------- | ------------------ |
| Any write occurred                | No                 |
| Production D1 write occurred      | No                 |
| Staging D1 write occurred         | No                 |
| Production-copy D1 write occurred | No                 |
| D1 export/import/execute occurred | No                 |
| Production migration occurred     | No                 |
| Employee entry write occurred     | No                 |
| Handover submit occurred          | No                 |
| Void/delete occurred              | No                 |
| Settings changed                  | No                 |
| Dashboard formula changed         | No                 |
| Financial formula changed         | No                 |
| Production cutover                | `PRODUCTION_NO_GO` |

## Live Links

| Purpose              | URL                                                                       | Result                                                                |
| -------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Unified login        | `https://homelink-finance.habibramadan888.workers.dev/unified-login.html` | PASS                                                                  |
| Employee destination | `https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`   | PASS                                                                  |
| Owner destination    | `https://homelink-finance.habibramadan888.workers.dev/index.html`         | PASS via `/` smoke; `/index.html` already covered in route diagnosis. |

## Next Internal QA Eligibility

Unified login read-only internal testing can start.

Full write QA is still not approved because the live Worker binds `DB = homelink`; any employee entry, handover submit, void/delete, settings change, or business save action requires a separate explicit write-test approval.

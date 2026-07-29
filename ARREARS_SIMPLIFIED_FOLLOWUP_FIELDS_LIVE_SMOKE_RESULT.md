# Arrears Simplified Follow-Up Fields Live Smoke Result

## Scope

Read-only static smoke after production Worker deploy. No login, no business write, no D1 command.

## Result

| Check                                                               | Result           |
| ------------------------------------------------------------------- | ---------------- |
| Owner arrears card renderer is present in production JS             | PASS             |
| Owner arrears card no longer renders promised amount label          | PASS             |
| Owner arrears card no longer calls promised amount helper           | PASS             |
| Top arrears amount remains rendered from arrears amount helper      | PASS             |
| Promised date remains rendered                                      | PASS             |
| Follow-up note remains rendered                                     | PASS             |
| Owner details no longer include promised amount                     | PASS             |
| WhatsApp export no longer includes promised amount                  | PASS             |
| Employee v2/v3 assets uploaded by Wrangler                          | PASS             |
| Unauthenticated HTML fetch avoided for protected employee internals | PASS             |
| D1 write                                                            | no               |
| Migration                                                           | no               |
| Production cutover                                                  | PRODUCTION_NO_GO |

## Notes

Protected HTML routes can return the unauthenticated portal shell when fetched without a valid session, so employee internals were validated by local tests and Wrangler upload output rather than by unauthenticated production HTML scraping.

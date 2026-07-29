# OWNER_ARREARS_HIDE_INTERNAL_ID_LIVE_SMOKE_RESULT

## Read-Only Smoke

Fetched the deployed production asset with a cache-busting query string:

```text
https://homelink-finance.habibramadan888.workers.dev/index-51-main.js
```

## Static Verification

| Check                                                                                                                                        | Result |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -----: |
| asset status 200                                                                                                                             |    yes |
| `data-owner-arrears-business-title` marker present                                                                                           |    yes |
| card title uses `${bed}` and `${amount}` only                                                                                                |    yes |
| card renderer no longer calls `arrearCustomerLabel`                                                                                          |    yes |
| card renderer does not contain `ttlock-expired`, `#ttlock`, `ttlock_card`, `sourceRef`, `source_ref`, `dedupe`, `packageCode`, or `cardCode` |    yes |
| due line does not include technical code/package/card labels                                                                                 |    yes |
| bed fallback is `床位待确认`                                                                                                                 |    yes |
| amount fallback is `金额待确认`                                                                                                              |    yes |

## Scope

This was a read-only static asset smoke. No login token, cookie, D1 write, migration, employee entry write, handover, void, or delete action was performed.

## Remaining Manual Check

User should hard refresh the owner arrears page on mobile and confirm the first card line visually reads like:

```text
329｜630.00 AED
```

and not:

```text
#ttlock-expired-139783752｜329｜630.00 AED
```

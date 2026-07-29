# Owner Arrears Overview Loading Live Smoke Result

Status: production deploy completed; anonymous read-only smoke completed.

Anonymous read-only smoke:

| Check                                       | Result  |
| ------------------------------------------- | ------- |
| `/index.html` reachable                     | pass |
| `/index-51-main.js` reachable               | pass |
| `/api/me` without auth returns 401          | pass |
| Top nav does not show arrears               | protected route; verified by uploaded local asset and tests |
| Top nav does not wrap                       | protected route; requires authenticated visual check |
| Analysis entry exists                       | protected route; verified by uploaded local asset and tests |
| Overview contains arrears follow-up module  | pass, JS marker `ownerOverviewArrearsPanel` present |
| Overview first paint not blocked by arrears | pass, async marker and skeleton renderer present |
| Arrears module has timeout/retry            | pass, `ARREARS_FETCH_TIMEOUT_MS=10000` and `retryOwnerOverviewArrears` present |
| No 3-minute infinite loading path           | pass, bounded timeout marker present |
| View all exists                             | pass, `toggleOverviewArrearsAll` present |
| No business write                           | pass, no authenticated write or D1 command executed |

Notes:

- Anonymous access to `/index-51.html` resolves to the protected root/portal shell, so DOM-level owner navigation smoke requires an authenticated browser session.
- Wrangler deploy confirmed that `/index.html`, `/index-51.html`, and `/index-51-main.js` were uploaded as modified static assets.

Authenticated visual acceptance still requires the user to hard refresh and provide a new mobile screenshot.

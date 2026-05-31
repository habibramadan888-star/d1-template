# P0 Arrears Backend SOT Live UI Smoke Result

## Public Read-Only Smoke

| Check                             | Result |
| --------------------------------- | ------ |
| `GET /`                           | `200`  |
| Three-door employee portal exists | yes    |
| Three-door owner portal exists    | yes    |
| Three-door admin portal exists    | yes    |
| Fourth arrears portal exists      | no     |
| Token/cookie printed              | no     |
| D1 write                          | no     |
| Migration                         | no     |

## Owner Authenticated UI Smoke

Authenticated owner UI smoke was not executed because creating a new production login session would write to `active_sessions`, and this task explicitly prohibits D1 writes and real session writes.

Verified live static UI asset state:

- `/index-51-main.js` contains the backend SOT endpoint.
- `/index-51-main.js` no longer contains the legacy `/api/arrears?limit=` fallback.
- `/index-51-main.js` no longer calls the client TTLock loader from `loadArrearsForOwner`.
- Preview-count marker is present for `已显示 N / 共 M` style UI.

## Remaining Manual Read-Only Check

Use an already-authenticated owner/readonly browser session, if available, to verify:

1. Overview arrears module loads from backend SOT.
2. Summary and preview count do not conflict.
3. View all works.
4. Load more works if shown.
5. Existing arrears and TTLock source statuses are visible when returned by API.
6. Partial failure warning does not hide the other source.

Production cutover remains `PRODUCTION_NO_GO`.

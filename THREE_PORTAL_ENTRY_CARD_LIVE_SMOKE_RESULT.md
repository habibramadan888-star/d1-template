# Three Portal Entry Card Live Smoke Result

## Status

Read-only live smoke passed after production static asset deploy.

## Smoke Checklist

| Check                                              | Result          |
| -------------------------------------------------- | --------------- |
| GET `/` displays three doors                       | pass            |
| Main portal hides arrears management entry card    | pass            |
| Employee entry remains visible                     | pass            |
| Owner entry remains visible                        | pass            |
| Admin entry remains visible                        | pass            |
| Owner arrears module remains available after login | static verified |
| Employee arrears follow-up remains in employee app | static verified |
| Readonly admin arrears view remains read-only      | static verified |
| Business write performed                           | no              |
| D1 write performed                                 | no              |

## Live Read-Only GET Evidence

Target: `https://homelink-finance.habibramadan888.workers.dev/`

| Field                                  | Value |
| -------------------------------------- | ----- |
| HTTP status                            | 200   |
| Employee text present                  | true  |
| Owner text present                     | true  |
| Admin text present                     | true  |
| `欠款管理` entry text present          | false |
| `ARREARS FOLLOW-UP` entry text present | false |
| `data-portal` count                    | 3     |

## Redirect Evidence

Read-only GET checks:

| Path                     | Result               |
| ------------------------ | -------------------- |
| `/unified-login.html`    | `302` to `/`         |
| `/employee-v3.html`      | `302` to `/employee` |
| `/index.html`            | `302` to `/owner`    |
| `/employee` without auth | `302` to `/`         |
| `/owner` without auth    | `302` to `/`         |
| `/admin` without auth    | `302` to `/`         |

## Production Cutover

Production cutover remains `PRODUCTION_NO_GO`.

# Acceptance Bugfix Live Read-Only Smoke Result

Date: 2026-05-31

Live URL:

- `https://homelink-finance.habibramadan888.workers.dev`

## Read-Only Smoke Scope

This smoke fetched live static assets only:

- `/portal.html`
- `/index-51-main.js`
- `/`

No authenticated production session was created because that would write `active_sessions`.
No write endpoint was called.

## Results

| Check | Result | Notes |
|---|---|---|
| Root route reachable | PASS | `/` returned 200. |
| Portal route reachable | PASS | `/portal.html` returned 200. |
| Owner JS route reachable | PASS | `/index-51-main.js` returned 200. |
| Portal entries | PASS | Exactly `employee`, `owner`, `admin`. |
| Fourth portal entry | PASS | No `arrears`, `directive`, or extra portal identity entry. |
| Portal text alignment CSS | PASS | `.door` uses centered layout and `.door span` centers text. |
| Portal labels | PASS | Employee/Owner/Admin and Chinese labels present. |
| Send button enablement logic | PASS | Live JS updates all directive buttons from checked checkbox count. |
| Removed old disabled gates | PASS | Live send-button state does not depend on `requestedDate`, `employeeTarget`, or `directiveEnabled`. |
| Send-employee write behavior | PASS | Final `sendArrearDirectives()` is dry-run only and does not call `/api/arrear_tasks/directive`. |
| WhatsApp live button path | PASS | Final `exportArrearsWhatsApp()` uses `ownerArrearsExportRows()` and `buildArrearsWhatsAppText(rows)`. |
| Selected-vs-filter export behavior | PASS | `ownerArrearsExportRows()` uses selected rows first, otherwise current filtered rows. |
| Clipboard/share/fallback text | PASS | Clipboard, WhatsApp URL, and fallback modal use the same `text` variable. |
| Export de-duplication | PASS | Builder calls `dedupeArrearsExportRows(rows)`. |
| Prohibited raw labels in final export path | PASS | Final export/send path does not include `ttlock_card`, `source_type`, `deposit_fils`, or `rent_fils`. |
| D1 write | PASS | No D1 write performed. |
| Migration | PASS | No migration performed. |
| Business write | PASS | No business write performed. |
| Production cutover | PASS | Remains `PRODUCTION_NO_GO`. |

## Boundary

The live static/function smoke confirms the deployed logic. A real authenticated mobile click-through still requires user acceptance because creating a fresh production login session would write `active_sessions`, which was prohibited in this deploy task.

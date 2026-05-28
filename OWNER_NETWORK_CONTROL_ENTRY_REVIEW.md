# AUTH-ROUTING-STABILIZATION-001 Owner Network Control Entry Review

Date: 2026-05-29, Asia/Dubai

| Question                              | Answer                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| WiFi/network control function exists? | Yes. The owner SPA still contains `view-wifi`, `wmRenderPage()`, and Worker routes under `/api/wifi/accounts`. |
| Current entry before fix              | The page existed but the main owner navigation did not expose a visible `网络` tab.                            |
| Was it hidden by UI restructuring?    | Yes. The route remained, but no stable owner-facing entry was present after previous nav changes.              |
| Restored location                     | Owner primary navigation now includes `网络 / NETWORK`; owner overview quick actions also include `网络`.      |
| Permission impact                     | No. Worker routes still require manager role.                                                                  |
| D1/settings write in this task        | No. No WiFi settings were modified or tested.                                                                  |

The network entry is restored as navigation only. Actual WiFi account read/write
behavior is unchanged and remains protected by owner/manager authorization.

Production status remains `PRODUCTION_NO_GO`.

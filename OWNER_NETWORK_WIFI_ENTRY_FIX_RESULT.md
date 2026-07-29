# AUTH-UI-STABILIZATION-002 Owner Network / WiFi Entry Fix Result

Date: 2026-05-29, Asia/Dubai

| Question                                | Answer                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| WiFi / network control function exists? | Yes. Owner shell has `view-wifi`, `navWifi`, and `wmRenderPage()`.                                |
| Current entry                           | Main owner navigation: `网络 / NETWORK`.                                                          |
| Was it hidden?                          | It can appear locked for non-manager roles; manager sessions unlock it.                           |
| Recommended location                    | Main owner navigation is acceptable because the user identified it as an expected owner function. |
| Restored / confirmed?                   | Confirmed present and covered by regression test.                                                 |
| Permission impact                       | No. Existing role lock/unlock behavior remains.                                                   |

No network device logic, D1 data, settings data, dashboard calculation, or financial formula was changed.

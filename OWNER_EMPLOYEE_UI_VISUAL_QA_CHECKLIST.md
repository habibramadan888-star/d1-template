# Owner Employee UI Visual QA Checklist

Production status: `PRODUCTION_NO_GO`. This checklist is for internal visual QA only and does not approve business writes or production cutover.

## Required Screenshots

| Screenshot                    | Required | Pass/Fail | Notes                                                    |
| ----------------------------- | -------- | --------- | -------------------------------------------------------- |
| Unified login desktop         | Yes      |           |                                                          |
| Unified login mobile          | Yes      |           | Must match the original employee login screenshot.       |
| Employee-v3 desktop           | Yes      |           |                                                          |
| Employee-v3 mobile            | Yes      |           |                                                          |
| Employee home mobile          | Yes      |           | Confirm owner/employee design language match.            |
| Owner dashboard desktop       | Yes      |           |                                                          |
| Owner dashboard mobile        | Yes      |           |                                                          |
| Owner top navigation mobile   | Yes      |           | Confirm no garbled icon/text and no overflow.            |
| Owner primary nav mobile      | Yes      |           | Confirm no main `录入` tab.                              |
| Owner client credit mobile    | Yes      |           | Confirm client cards/search/filter match employee style. |
| Owner search/filter area      | Yes      |           | Confirm shared input/select/button styling.              |
| Owner loading state           | Yes      |           |                                                          |
| Owner empty state if possible | Yes      |           |                                                          |
| Owner error state if possible | Yes      |           |                                                          |
| Owner history/list/table      | Yes      |           |                                                          |
| Browser back signed-in state  | Yes      |           |                                                          |
| Clear session state           | Yes      |           |                                                          |

## Manual Checks

| Check                                               | Pass/Fail | Notes |
| --------------------------------------------------- | --------- | ----- |
| Font family matches employee                        |           |       |
| Font sizes feel from same hierarchy                 |           |       |
| Button radius/height/weight matches employee        |           |       |
| Inputs match employee style and focus state         |           |       |
| Cards match employee glass/radius/shadow            |           |       |
| Page background matches employee product feel       |           |       |
| Spacing matches employee rhythm                     |           |       |
| Radius scale is consistent                          |           |       |
| Shadow/elevation is consistent                      |           |       |
| Loading state is consistent                         |           |       |
| Mobile layout is consistent                         |           |       |
| Owner no longer looks like an old system            |           |       |
| Owner no longer flashes a second login page         |           |       |
| Owner primary nav no longer shows `录入`            |           |       |
| Control panel icon/text is not garbled              |           |       |
| Right-side topbar controls stay in viewport         |           |       |
| Owner client page matches employee card style       |           |       |
| Unified login uses employee login background        |           |       |
| Unified login uses employee login card style        |           |       |
| Unified login uses employee input/button style      |           |       |
| Only `unified-login.html` is treated as login entry |           |       |
| Back-button experience is clear                     |           |       |
| First load has visible feedback                     |           |       |
| No write test performed                             |           |       |
| Production remains `PRODUCTION_NO_GO`               |           |       |

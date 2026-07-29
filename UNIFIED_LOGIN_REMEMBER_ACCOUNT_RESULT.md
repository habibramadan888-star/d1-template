# Unified Login Remember Account Result

Date: 2026-05-28, Asia/Dubai

Scope: `unified-login.html` account persistence only. This change does not approve production D1 write, migration, D1 export/import/execute, employee entry write, handover, void/delete, settings change, production cutover, or commercial launch GO.

| Item                        | Result                            |
| --------------------------- | --------------------------------- |
| Remember username / account | yes                               |
| Password / PIN saved        | no                                |
| Browser autocomplete used   | yes                               |
| Username autocomplete       | `autocomplete="username"`         |
| Password autocomplete       | `autocomplete="current-password"` |
| Stored key                  | `homelink:remember_account`       |
| Stored value                | account / employee ID only        |
| Token printed               | no                                |
| Password printed            | no                                |
| Login logic changed         | no                                |

## Behavior

- If `记住账号` is checked, the username / employee ID / owner account field is saved to local storage after the server confirms the login session.
- If `记住账号` is unchecked, any saved account value is removed.
- Password / PIN is never saved to localStorage, sessionStorage, or any project-controlled storage.
- Browser password managers may offer to save passwords through standard `autocomplete`; the app itself does not store passwords.
- Page load pre-fills only the remembered account field. The password field remains empty.

## Clear Session

`Clear session` removes the current cloud token from localStorage and sessionStorage and clears the password field. If `记住账号` remains checked, the remembered account is preserved. If it is unchecked, the remembered account is removed and the account field is cleared.

Production cutover remains `PRODUCTION_NO_GO`.

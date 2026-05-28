# Employee Login Visual Standard

Date: 2026-05-28, Asia/Dubai

Source: `deploy-worker/public/employee-v3.html`.

| Area                                     | Employee Login Standard                                                                                | Source Selector / File               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Page background                          | Full-page green/white glass background with radial green glow at 70% 20% over `rgba(237,247,242,.78)`. | `.login-overlay`, `employee-v3.html` |
| Background blur / glow                   | `backdrop-filter: blur(30px) saturate(170%)` and green radial glow.                                    | `.login-overlay`                     |
| Login card width                         | `width:min(420px,96vw)`.                                                                               | `.login-card`                        |
| Card border-radius                       | `32px`.                                                                                                | `.login-card`                        |
| Card padding                             | `28px`.                                                                                                | `.login-card`                        |
| Card shadow                              | `0 32px 90px rgba(15,23,42,.18), inset 0 1px 0 rgba(255,255,255,.92)`.                                 | `.login-card`                        |
| Logo size / position                     | 48px green HOME/LINK badge in the login brand row, aligned left of title.                              | `.badge`, `.login-brand`             |
| Title font-size / weight                 | `26px`, weight `820`, dark text.                                                                       | `.login-title`                       |
| Subtitle font-size / letter spacing      | `10px`, muted text, `.12em` letter spacing, uppercase.                                                 | `.login-title small`                 |
| Label font-size / weight                 | `14px`, weight near `680`, muted dark text.                                                            | `.field label`                       |
| Input height / border / radius / focus   | 54px field, `1.5px` soft border, 16px radius, green focus halo.                                        | `input`, `input:focus`               |
| Button height / radius / gradient / font | 54px minimum, 17px radius, green vertical gradient, bold text.                                         | `.btn.primary`                       |
| Helper text card                         | Glass hint card with dashed soft green border, 18px radius, 14px text, relaxed line height.            | `.hint`                              |
| Mobile width / spacing                   | Card remains `96vw`, mobile padding reduces to 24px, controls become full-width.                       | `.login-card`, mobile rules          |

## Screenshot Alignment

The provided mobile screenshot matches this standard: single centered glass
login card, HOME/LINK badge, bilingual title, two rounded fields, green primary
button, and a compact helper card below the action.

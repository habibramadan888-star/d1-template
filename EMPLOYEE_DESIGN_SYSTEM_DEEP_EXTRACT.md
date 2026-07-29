# Employee Design System Deep Extract

Scope: extracted from `deploy-worker/public/employee-v3.html` and `deploy-worker/public/unified-login.html`.

Production status: `PRODUCTION_NO_GO`. This is a UI/design-system extraction only. No D1 write, migration, deploy, employee entry write, handover, void, dashboard formula, or financial formula change is approved by this document.

## Typography

| Token                          | Actual Value                                                                                                       | Used In Employee                      | Notes                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------ |
| font-family                    | `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif` | `body`, later employee premium layer  | Final employee layer overrides earlier Inter stack.    |
| base font size                 | `14px`                                                                                                             | `body`, labels, form text             | Base owner alignment should not be smaller than this.  |
| h1 size / weight / line-height | `50px`, `950`, approx `1.05`                                                                                       | `.page-title` desktop                 | Mobile becomes `38px`.                                 |
| h2 size / weight / line-height | `26px`, `950`, tight                                                                                               | `.title` / section card headers       | Owner card title should match this hierarchy.          |
| h3 size / weight / line-height | `19px`, `760`, tight                                                                                               | `.step-title`                         | Used for form step titles.                             |
| section title size             | `26px`, `950`                                                                                                      | `.title`                              | Employee section title is large and high-weight.       |
| card title size                | `26px`, `950`                                                                                                      | `.title`                              | Owner old `14px` card title was too small.             |
| card numeric value size        | `19px` to `20px`, `700` to `850`                                                                                   | `.kpi-card b`, money fields           | Employee uses tabular, readable finance numerals.      |
| body text size                 | `14px` to `22px` depending context                                                                                 | `.small`, `.page-sub`, `.hint`        | Employee prefers larger explanatory copy than owner.   |
| secondary text size            | `12px` to `14px`                                                                                                   | `.operator`, `.ctx span`, `.small`    | Muted but readable.                                    |
| helper text size               | `14px` to `15px`                                                                                                   | `.hint`, `.context-note`              | Helper text has high line-height.                      |
| button text size               | `14px` to `18px`                                                                                                   | `.btn`, `.event-chip`, `.pill`        | Buttons are bold and touch-friendly.                   |
| input text size                | `14px` desktop, `16px` mobile                                                                                      | `input`, `select`, `textarea`         | Mobile avoids tiny input text.                         |
| table/list text size           | `13px` to `15px`                                                                                                   | preview/detail/list rows              | Numeric data uses tabular style.                       |
| badge text size                | `10px` to `12px`                                                                                                   | `.badge small`, `.status-pill`, `.en` | Badges are compact, not primary.                       |
| error text size                | `14px`, bold                                                                                                       | `.bad`, `.warn`                       | Uses red/orange semantic colors.                       |
| line-height                    | `1.45` to `1.75`                                                                                                   | `.page-sub`, `.small`, `.hint`        | Employee favors relaxed readable copy.                 |
| font smoothing / rendering     | Apple stack + premium layer                                                                                        | `body`                                | Owner should inherit same rendering via shared tokens. |

## Colors

| Token             | Actual Value                               | Used In Employee                | Notes                                      |
| ----------------- | ------------------------------------------ | ------------------------------- | ------------------------------------------ |
| page background   | `#f4f6f8` plus green/blue radial gradients | `html`, `body`, premium layer   | Modern atmospheric page background.        |
| card background   | `rgba(255,255,255,.78)` to `.94`           | `.card`, `.step`, `.kpi-card`   | Glass cards, not flat white boxes.         |
| primary color     | `#09a64f`                                  | `--green`, buttons, active tabs | Source for shared `--color-primary`.       |
| primary hover     | `#078d42`                                  | `--green2`, primary gradients   | Source for shared `--color-primary-hover`. |
| secondary color   | `#5f6877` / `#586273`                      | helper/sub text                 | Shared as text secondary.                  |
| text primary      | `#111827`                                  | `--text`, headings              | Source for shared `--color-text-primary`.  |
| text secondary    | `#5f6877`                                  | `--muted`                       | Used in captions and body support text.    |
| text muted        | `#8a94a3` / `#7b8797`                      | `.soft`, small text             | Used for low-emphasis metadata.            |
| border color      | `#dfe5e8`                                  | `--line`, inputs/cards          | Replaced owner gray borders.               |
| divider color     | `rgba(203,213,225,.52)`                    | card heads, panels              | Subtle glass dividers.                     |
| success           | `#09a64f`                                  | success state                   | Same as primary.                           |
| warning           | `#e16b00`                                  | `.warn`, orange money           | Preserved as semantic warning.             |
| danger/error      | `#d93025`                                  | `.bad`, `.btn.danger`           | Preserved as semantic danger.              |
| info              | `#1a73e8`                                  | blue numeric/info state         | Used for bank/info emphasis.               |
| disabled          | `#f2f6f4`                                  | readonly inputs                 | Disabled fields are soft, dashed.          |
| input background  | `rgba(255,255,255,.68)`                    | premium input layer             | Glass input field.                         |
| button text color | `#fff` primary, `#263246` secondary        | `.btn.primary`, `.btn`          | Strong contrast.                           |

## Spacing

| Token                | Actual Value                          | Used In Employee               | Notes                                    |
| -------------------- | ------------------------------------- | ------------------------------ | ---------------------------------------- |
| page padding desktop | `52px 28px 110px`, later `64px` top   | `.wrap`                        | Owner container should not feel cramped. |
| page padding mobile  | `38px 16px 90px`                      | `.wrap` mobile                 | Used as mobile baseline.                 |
| container max width  | `980px` initial, later up to `1480px` | `.brand`, `.tabs`, `.wrap`     | Shared `--container-max` is `1480px`.    |
| card padding         | `26px`, mobile `18px`                 | `.body`, `.head`               | Owner cards now use this scale.          |
| card gap             | `24px`                                | `.card margin-bottom`          | Avoids old dense layout.                 |
| section gap          | `18px` to `30px`                      | `.step`, `.page-sub`           | Employee uses generous separation.       |
| form field gap       | `16px`                                | `.field`                       | Form rhythm.                             |
| button gap           | `12px` to `14px`                      | `.row`, `.actions`             | Touch-friendly.                          |
| list item padding    | `14px` to `20px`                      | `.preview-entry`, `.task`      | Readable cards.                          |
| table cell padding   | `10px` to `12px` equivalent           | preview/details                | Tables should avoid compressed cells.    |
| header spacing       | `18px 24px`, mobile `14px 16px`       | `.brand`, `.tabs` polish layer | Owner header now uses same rhythm.       |

## Components

| Component          | Employee Standard                                        | Notes                                            |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------ |
| primary button     | Green vertical gradient, white text, high radius, shadow | Shared `.hl-button-primary`.                     |
| secondary button   | Glass white button, border, soft shadow                  | Shared `.hl-button-secondary`.                   |
| danger button      | Soft red background, red text                            | Shared `.hl-button-danger`.                      |
| input              | 54px-ish height, rounded 16/17px, green focus halo       | Shared `.hl-input`.                              |
| select             | Same as input                                            | Shared `.hl-select`.                             |
| textarea           | Rounded, min-height around 104px                         | Owner kept formula logic, only style aligned.    |
| card               | Glass, 30px radius, elevated shadow                      | Shared `.hl-card`.                               |
| stat card          | Glass, rounded, tabular numeric value                    | Shared `.hl-stat-card`.                          |
| action card        | Same glass treatment with interactive elevation          | Owner action cards inherit card layer.           |
| section header     | Large title, strong weight, subtle divider               | Owner `.card-head` aligned.                      |
| top header/nav     | Sticky glass header, green active state                  | Owner `.topbar` and `.nav` aligned.              |
| badge/tag          | Pill radius, semantic colors                             | Shared `.hl-badge`.                              |
| table/list         | Rounded table-card or mobile-contained list              | Shared `.hl-table-card` / mobile containment.    |
| alert              | Soft background, semantic border                         | Shared `.hl-alert`.                              |
| toast              | Dark elevated toast                                      | Existing owner toast unchanged functionally.     |
| modal              | Glass/elevated modal                                     | Existing owner modal style aligned by layer.     |
| loading state      | Spinner/skeleton style, no old login flash               | Owner auth loading now styled.                   |
| empty state        | Centered, muted, card-like                               | Owner `.empty-state` aligned.                    |
| error state        | Red semantic text/panel                                  | Shared `.hl-alert-error`.                        |
| mobile card layout | 26px radius, one-column forms, readable cards            | Owner mobile layer mirrors employee breakpoints. |

## Mobile

| Token                   | Actual Value                              | Used In Employee            | Notes                                          |
| ----------------------- | ----------------------------------------- | --------------------------- | ---------------------------------------------- |
| breakpoint              | `720px`                                   | Employee mobile media query | Owner aligned to `720px` for final layer.      |
| mobile padding          | `16px` page/card rhythm                   | `.wrap`, `.brand`, `.tabs`  | Owner container uses `14px` to fit nav.        |
| mobile button height    | approx `50px` to `58px`                   | tabs/buttons                | Owner nav and buttons now match touch target.  |
| mobile card width       | full width with 26px radius               | `.card`                     | Owner cards use full-width card layout.        |
| mobile list style       | card/list or horizontally-contained table | preview/detail/table blocks | Owner tables are contained, not page-breaking. |
| mobile form style       | one-column, 16px inputs                   | `.grid`, `.form-row`        | Owner forms switch to one column.              |
| mobile font adjustments | page title `38px`, body `13px` to `17px`  | mobile media                | Owner numeric and form text enlarged.          |

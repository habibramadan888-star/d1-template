# Owner UI Deep Gap Audit

Scope: `deploy-worker/public/index.html`, `deploy-worker/public/index-51.html`, `deploy-worker/public/index-51-main.js`.

Production status: `PRODUCTION_NO_GO`. This audit is UI-only and does not approve production write, deploy, migration, cutover, or financial/dashboard formula changes.

| UI Area                      | Employee Standard                             | Current Owner Style                                       | Severity | Required Fix                                              | File/Selector                            |
| ---------------------------- | --------------------------------------------- | --------------------------------------------------------- | -------- | --------------------------------------------------------- | ---------------------------------------- |
| font-family                  | Apple/SF + PingFang/Microsoft YaHei token     | Mixed Inter/JetBrains and local overrides                 | HIGH     | Use shared `--font-family` for owner UI controls          | `html,body`, `.owner-ui-unified`         |
| global font size             | 14px base, larger mobile inputs               | 14px base but many 9px/10px labels                        | HIGH     | Normalize labels and controls through shared tokens       | `.field label`, `.kpi-lbl`, `.inp`       |
| heading hierarchy            | Large display and 26px card titles            | Owner card titles were historically 14px                  | HIGH     | Use 22px+ card titles and 38px page titles                | `.card-title`, `.page-title`             |
| button style                 | Rounded 17px, green gradient primary          | Old 8px compact buttons remain in base CSS                | CRITICAL | Override owner buttons with shared radius/height/shadow   | `.btn`, `.btn-primary`, `.btn-ghost`     |
| input style                  | 54px glass field, green focus halo            | Compact 8px radius base fields                            | CRITICAL | Override inputs with shared height/radius/focus           | `.inp`, `.sel`, `.ta`, `.code-inp`       |
| card style                   | 30px glass card, strong elevation             | Some owner sections were flat compact white panels        | CRITICAL | Apply shared glass/elevated card layer                    | `.card`, `.hist-card`, `.kpi`            |
| dashboard stat cards         | `.hl-stat-card` with tabular `.hl-stat-value` | Dynamic KPI markup only used `.kpi`                       | CRITICAL | Render shared stat-card classes from JS                   | `renderSummary()`                        |
| page background              | Modern radial/linear premium background       | Base owner background was flat gray                       | HIGH     | Use shared page background via `hl-page`                  | `body.owner-ui-unified`                  |
| login panel                  | Unified glass login, loading first            | Old owner login fallback could look like legacy system    | HIGH     | Style auth loading and fallback with shared layer         | `.lock-overlay`, `.lock-card`            |
| header/nav                   | Sticky glass header with strong active state  | Compact owner nav with older spacing                      | HIGH     | Use shared header/nav spacing and green active state      | `.topbar`, `.nav`, `.nav-btn`            |
| table/list style             | Card/list or contained table on mobile        | Tables can still be dense                                 | MEDIUM   | Add table containment and card styling                    | `.table-wrap`, `.tx-table`               |
| filter/search controls       | Rounded glass controls                        | Mixed inline controls and old radii                       | MEDIUM   | Override filter controls with shared input/button tokens  | `.filter-row`, `.ftab`, `.search-wrap`   |
| spacing                      | Generous 16/24/32px rhythm                    | Some owner panels remain dense                            | HIGH     | Add final owner layer spacing                             | `.container`, `.card-body`, `.kpi-strip` |
| radius                       | 17/22/30px scale                              | Legacy 8/10/16px scale remains in base CSS                | HIGH     | Use shared radius aliases and final overrides             | `--r`, `--r2`, `.owner-ui-unified`       |
| shadow                       | Elevated glass shadows                        | Base shadows are subtle and old                           | MEDIUM   | Use `--shadow-elevated`                                   | `.card`, `.kpi`, `.modal`                |
| loading state                | Clear skeleton/loading before data            | Owner auth loading existed but not fully employee-aligned | HIGH     | Style `ownerAuthLoading` as modern loading card           | `.owner-auth-loading`                    |
| empty state                  | Centered, muted, card-like                    | Existing empty state was serviceable but old              | MEDIUM   | Apply shared empty-state visual                           | `.empty-state`                           |
| error state                  | Semantic red panel/text                       | Existing red text works but not unified                   | MEDIUM   | Keep semantics, align with shared alert style             | `.codeErr`, `.toast.err`                 |
| mobile layout                | One-column forms, readable cards              | Some tables require containment                           | HIGH     | Add owner 720px final mobile layer                        | `@media(max-width:720px)`                |
| owner old login flicker      | No old login before `/api/me`                 | Already fixed in auth handoff; needs visual polish        | HIGH     | Keep hidden fallback, show loading first                  | `ownerLoginPanel`, `ownerAuthLoading`    |
| 10-second loading experience | Skeleton/progressive loading                  | Dashboard still loads data after auth                     | MEDIUM   | Do not show old login; keep shell/loading feedback        | owner bootstrap                          |
| browser back behavior        | Signed-in panel, no redirect loop             | Already fixed in unified-login logic                      | HIGH     | Preserve signed-in panel and clear session                | `unified-login.html`                     |
| visual professionalism       | Same product family as employee               | Owner still had mixed old/new layers                      | CRITICAL | Add shared tokens/classes and final owner alignment layer | new shared CSS + owner overrides         |

## Areas That Looked Like An Old System

| Area            | Why It Looked Old                                                  | Fix Applied                                                                             |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Compact buttons | Small 8px radius and dense padding did not match employee touch UI | Final owner layer uses shared button height/radius/gradient.                            |
| KPI cards       | Small labels and flat stat boxes looked like an internal utility   | Dynamic KPI markup now includes `.hl-stat-card`, `.hl-stat-label`, `.hl-stat-value`.    |
| Login fallback  | Legacy code-entry panel could flash before auth check              | Auth loading remains first; panel is visually aligned and hidden until needed.          |
| Tables          | Dense desktop table feel on mobile                                 | Table wrapper remains scroll-contained; mobile cards and forms are emphasized.          |
| Header/nav      | Compact old navigation did not match employee tab rhythm           | Owner nav gets glass background, larger touch targets, and employee green active state. |

# Owner UI Real Screenshot Gap Review

Date: 2026-05-28, Asia/Dubai

Scope: real live phone screenshots supplied by Ramadan Habib. The screenshots are the source of truth for this task. Previous static-asset claims are not treated as successful until the live Worker shows the same result.

Production cutover status: `PRODUCTION_NO_GO`

## Screenshot-Based Findings

| 问题                            | 截图中表现                                                                           | 线上是否仍存在                                     | 根因                                                                                                                     | 文件/selector                                                                                               | 修复方式                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 控制面板左侧乱码                | `控制面板` 左侧出现异常 glyph / icon，像 emoji 或字体 fallback 渲染失败。            | Yes, live screenshot shows it.                     | Live Worker is serving stale owner UI assets or embedded assets that still include old glyph-based button content.       | `deploy-worker/public/index.html` `#btnDashboard`; embedded artifact `deploy-worker/src/index.embedded.js`. | Use inline SVG `<use href="#i-chart">` plus text `控制台`; remove emoji fallback and regenerate embedded Worker before deploy.    |
| 主导航 `录入` 仍存在            | 老板端主导航仍显示 `录入 / 历史 / 分析 / 客户`。                                     | Yes, live screenshot shows it.                     | Live Worker has not picked up the local owner nav IA changes; owner JS also still kept `entry` as a routable owner view. | `#navTabs`, `.nav-btn[data-view="entry"]`, `switchView(v)`.                                                 | Keep owner nav as `总览 / 历史 / 客户 / 网络`; add JS guard so owner/manager cannot switch to `entry`.                            |
| `添加记录 ADD ENTRY` 仍存在     | 老板端首页仍显示员工录入区块和 payment-type cards.                                   | Yes, user reported live screenshot still shows it. | Legacy `view-entry` remains in owner SPA and `ownerEntryTool` / old default routing can expose it.                       | `#view-entry`, `#ownerEntryTool`, `switchView('entry')`, `enterAs`.                                         | Hide/deprecate owner entry tool, force `#view-entry.owner-entry-disabled` hidden, and redirect owner `entry` route to `analysis`. |
| 老板端视觉和员工端不一致        | 老板端仍像旧系统，密度高、顶部按钮/导航旧，和员工端绿色现代卡片差距明显。            | Yes.                                               | Live asset drift plus owner UI still exposing old entry shell.                                                           | Owner topbar, nav, cards, client credit area.                                                               | Retain shared design tokens and continue removing old owner shell entry exposure.                                                 |
| 顶部区域按钮/图标/文字密度      | 右侧控制按钮贴近边缘，移动端空间紧张。                                               | Yes, screenshot shows tight mobile layout.         | Mobile topbar right side max widths were too generous for narrow devices.                                                | `.owner-ui-unified .topbar-row1`, `.topbar-right`, `.owner-dashboard-btn`, `.role-badge`.                   | Reduce mobile gaps/max widths and keep all controls clipped inside viewport.                                                      |
| 待收尾款列表仍偏旧式            | 客户页 lower list/empty state still feels less polished than employee cards.         | Partial.                                           | List/empty states still use mixed old inline styles in some generated client-credit HTML.                                | `ccRender`, `#ccCards`, `.cc-card`, `.cc-empty`.                                                            | Keep client-credit controls on shared tokens; leave deeper generated-card polish for follow-up if screenshots still fail.         |
| 总收入/统计卡片与员工端卡片风格 | Owner stat cards are closer locally but live screenshot still shows older rendering. | Yes on live.                                       | Static deploy/embedded refresh missing from live route.                                                                  | `.kpi`, `.ana-kpi`, `.hl-stat-card` equivalents.                                                            | Deploy refreshed static UI assets only after dry-run verification.                                                                |

## Safety Boundary

- Production D1 write: no.
- Migration: no.
- D1 export/import/execute: no.
- Dashboard calculation change: no.
- Financial formula change: no.
- Business write flow change: no.
- Commercial launch status: `PRODUCTION_NO_GO`.

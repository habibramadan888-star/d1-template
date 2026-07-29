# Owner Navigation And Page Boundary Lock

## Final Navigation Principle

Owner primary navigation must be stable, centered, non-scrolling, non-wrapping, and must not include arrears as a first-level tab.

Recommended primary nav:

1. 总览
2. 历史
3. 分析
4. 客户
5. 网络, only if it fits without wrapping; otherwise network moves to control/more.

Arrears is part of owner overview, not a root login entry and not a primary owner tab.

## Current Evidence

| Evidence                                      | Current                                                       |
| --------------------------------------------- | ------------------------------------------------------------- |
| `index-51.html` top nav                       | `overview`, `history`, `analysis`, `clients`, `wifi`          |
| Top nav arrears item                          | Absent                                                        |
| `view-arrears` section                        | Present                                                       |
| `switchView()` support for arrears            | Present                                                       |
| `showOwnerAppShell()` references `navArrears` | Present, but no matching DOM element in current HTML          |
| Mobile CSS                                    | Multiple nav definitions; final lock uses 5-grid centered nav |
| Overview arrears module                       | `ownerOverviewArrearsPanel` exists                            |

## Page Boundary Matrix

| Page     | Must Have                                                                                       | Must Not Have                                                                  | Current Risk                                                                            | Test Needed                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 总览     | Business dashboard, arrears summary/follow-up module, recent handover/history signals           | QUICK ACTIONS, duplicate navigation, employee entry form as owner workflow     | Arrears is both overview module and hidden `view-arrears`; double boundary can regress. | Assert overview includes arrears module and no quick actions.                                      |
| 欠款模块 | Two-source arrears pool, date/note feedback, status, view-all/load-more, partial failure notice | Primary top tab, debug fields, old table layout, internal IDs, promised amount | `view-arrears` still exists and can be entered programmatically.                        | Assert arrears top nav absent; if standalone view remains, it must mirror overview module exactly. |
| 历史     | History list, detail view, load timeout/retry                                                   | 30-second blank, dependency on arrears loading                                 | History has separate async path and prior performance regressions.                      | Assert skeleton/error states and load-more behavior.                                               |
| 分析     | Visible/accesssible entry and analysis view                                                     | Removal during nav simplification                                              | Current top nav has analysis, but repeated nav edits have removed it before.            | Assert `data-view="analysis"` exists and switch renders `view-analysis`.                           |
| 客户     | Customer credit profile                                                                         | Hidden permanently due nav capacity                                            | Current DOM has locked class initially, later unlocked by role shell.                   | Assert manager/readonly shell removes locked state.                                                |
| 网络     | Network view or control/more access                                                             | Permanent disappearance                                                        | Current DOM has `wifi` top nav; can be moved only with explicit more/control plan.      | Assert network is accessible somewhere.                                                            |
| 控制台   | Secondary operational tools if needed                                                           | Primary business module disappearance                                          | Network may move here; must remain discoverable.                                        | Add test for secondary entry if network moved.                                                     |

## Required Regression Locks

| Lock                         | Test                                        |
| ---------------------------- | ------------------------------------------- |
| Arrears not in primary nav   | `owner-page-regression-lock`                |
| Analysis remains visible     | `owner-nav-all-modules`                     |
| No nav wrapping / scrolling  | `owner-nav-no-wrap`                         |
| No quick actions             | `owner-overview-no-quick-actions`           |
| Owner shell role unlocks nav | `readonly-admin-role` and owner shell smoke |

## Required Fixes Before More UI Work

1. Remove stale `navArrears` references or add explicit comments/tests explaining hidden route support.
2. Decide whether `view-arrears` is retained as internal route or eliminated. Do not leave it ambiguous.
3. Keep `analysis` in all nav test fixtures.
4. Every nav change must update both `index.html` and `index-51.html` or remove the duplicate file boundary.

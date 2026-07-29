# Owner UI Screenshot Gap Review

Date: 2026-05-28, Asia/Dubai

Scope: screenshot-driven owner UI pass 2. No production deploy, migration, D1 write, D1 export/import/execute, business write QA, dashboard calculation change, or financial formula change was performed.

| 问题                                 | 截图表现                                               | 影响                           | 修复方式                                                                                 | 优先级   |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------- | -------- |
| 老板端和员工端设计语言仍不统一       | 员工端像现代卡片式移动端，老板端顶部和客户页仍像旧后台 | 用户会感觉两个端不是同一产品   | 继续使用 `shared-design-tokens.css` 覆盖 owner topbar、nav、客户页控件、卡片和移动端间距 | HIGH     |
| 老板端顶部导航字体/按钮/卡片风格差异 | 老板端 topbar 控制按钮和员工端绿色主按钮不一致         | 品牌一致性不足                 | `btnDashboard` 改为 shared button 风格和 SVG 图标，mobile 下限制宽度                     | HIGH     |
| “控制面板”左侧图标或文字乱码         | 截图中控制面板左侧出现不稳定符号/emoji fallback        | 手机字体 fallback 可能显示乱码 | 移除 `🔐` emoji，改用内联 SVG `#i-chart` + 纯文字 `控制台`                               | CRITICAL |
| 右侧图标接近出屏 / mobile overflow   | 手机端右侧状态/按钮贴边                                | 影响可用性，容易误触           | mobile topbar 改为 grid，brand/right 区域设置 `min-width:0`、ellipsis、按钮最大宽度      | CRITICAL |
| 老板端主导航出现“录入”是否合理       | 主 Tab 首项为“录入 / ENTRY”                            | 老板端误导为员工录入入口       | 主导航移除 `entry`，默认进入 `总览 / OVERVIEW`；代录入仅保留在桌面端“管理工具”二级入口   | CRITICAL |
| 老板端客户页卡片风格与员工端卡片差异 | 客户页搜索、筛选、图例、卡片仍偏旧式                   | 客户信用档案不像同一套系统     | 搜索/筛选/刷新/图例改用 `hl-input`、`hl-select`、`hl-button`、shared card/radius/shadow  | HIGH     |
| 老板端底部/页脚风格是否统一          | 页脚轻量但仍保留旧文案                                 | 低风险视觉差异                 | 本轮不提高页脚视觉权重，保持轻量；后续截图验收如仍突兀再处理                             | LOW      |
| 手机端宽度、padding、gap 是否统一    | owner topbar/nav 与 employee mobile spacing 不一致     | 视觉割裂和 overflow            | mobile 下统一 `14px` 页面 padding、四列 nav grid、按钮高度和卡片圆角                     | HIGH     |

Production remains `PRODUCTION_NO_GO`.

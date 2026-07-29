# Owner Arrears Batch Export Live Smoke Result

Date: 2026-05-31

Target: `https://homelink-finance.habibramadan888.workers.dev`

Read-only smoke method:

- Fetched `/`
- Fetched `/index-51.html`
- Fetched `/index-51-main.js`
- Fetched `/api/me` without authentication
- Did not log in
- Did not execute any business write

| Check | Result |
|---|---|
| 三道门首页仍有员工 / 老板 / 管理员入口 | pass, static role hints present |
| 老板端欠款模块静态资源可打开 | pass |
| 欠款列表全选 / 取消全选代码已上线 | pass |
| 筛选只剩全部 / 通通锁已过期 / 系统已有欠款 | pass |
| 下发日期已消失于新 action bar | pass |
| 下发员工为 dry-run，不调用写接口 | pass |
| 卡片默认折叠 | pass |
| 展开后显示承诺日期 / 备注 / 状态 | pass |
| 按房间 / 床位自然排序代码已上线 | pass |
| WhatsApp 导出点击路径有 clipboard/window.open/manual fallback | pass |
| readonly_admin 不显示全选和下发按钮 | pass by source gate |
| `/api/me` unauthenticated | 401 |
| 是否执行业务写入 | no |

Authenticated mobile verification:

- Manual owner login is still required to verify the exact phone screenshot state.
- This smoke intentionally avoided creating or mutating authenticated production sessions.

Production cutover: `PRODUCTION_NO_GO`

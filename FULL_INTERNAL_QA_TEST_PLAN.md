# Full Internal QA Test Plan

## BED-TRANSFER-RECORD-ONLY-WORKFLOW-001 QA Addendum

Bed Transfer is now a record-only event ledger workflow.

QA must verify:

- Employee save writes a `bed_transfer_events` record with `status=recorded`.
- Employee save success copy is `Bed transfer recorded / 换床记录已保存`.
- Owner sees Bed Transfer records, not an approval/reject queue.
- Existing legacy `pending_review` rows remain visible as record-only legacy records.
- No occupancy, deposit, arrears, TTLock, financial formula, or dashboard calculation mutation occurs.
- Existing remote D1 databases must receive `migrations/006_bed_transfer_recorded_status.sql` before `status=recorded` writes.
- Staging record-only E2E passed and cleaned all QA rows.
- Production record-only smoke passed for `103 -> 947` with no business-state mutation.
- Production cutover remains `PRODUCTION_NO_GO`.

## BED-TRANSFER-EMPLOYEE-SAVE-PATH-E2E-DEPLOY-SMOKE-001 QA Addendum

The employee Bed Transfer event-ledger save path is enabled for internal testing only.

QA must verify:

- Employee can submit Bed Transfer as a `pending_review` owner-review event.
- Required fields remain From Bed, To Bed, Transfer Date, Reason, Note, and idempotency.
- Owner can see the pending review request.
- Replay/network retry does not duplicate the event.
- Bed Transfer is not a new tenant.
- Bed Transfer is not checkout.
- Bed Transfer does not mutate occupancy.
- Bed Transfer does not mutate deposit.
- Bed Transfer does not clear or mutate arrears.
- Bed Transfer does not mutate TTLock.
- Approve/reject is not enabled by this task.
- Production cutover remains `PRODUCTION_NO_GO`.

## BED-TRANSFER-EMPLOYEE-UI-WRITE-PATH-CLOSURE-001 QA Addendum

QA must verify the new event-ledger write path without treating it as production cutover:

- Employee TF save writes one `bed_transfer_events` request with `pending_review`.
- Employee TF save requires From Bed, To Bed, Transfer Date, Reason, Note, and idempotency.
- Owner can see pending-review transfer requests.
- Idempotent replay returns the existing response without duplicate event rows.
- Transactions, deposit ledger, arrear tasks, TTLock, financial formulas, and dashboard calculations remain unchanged.
- Bed Transfer is still not a new tenant and not a checkout.
- Production cutover remains `PRODUCTION_NO_GO`.

## BED-TRANSFER-LIVE-UI-RENDER-PATH-FIX-001 QA Addendum

The employee Bed Transfer live render path has been fixed and deployed as UI-only.

QA must verify:

- Selecting Bed Transfer switches the active Step 2 renderer to the dedicated Bed Transfer form.
- From Bed, To Bed, Transfer Date, Reason, and Note are visible without scrolling to unrelated later sections.
- The generic one-field Bed target UI is hidden for Bed Transfer.
- Step 3 uses Bed Transfer-specific context, not generic Bed Check-only context.
- Save/export remains gated; no production write is allowed.
- Production migration and real Bed Transfer smoke remain separate approval items.
- No D1 execute/export/import, occupancy mutation, deposit mutation, arrears mutation, TTLock mutation, financial formula change, dashboard calculation change, or production cutover is approved.

Production cutover remains `PRODUCTION_NO_GO`.

## BED-TRANSFER-PRODUCTION-UI-ONLY-DEPLOY-001 QA Addendum

The employee Bed Transfer UI-only fields have been deployed for phone inspection, but real Bed Transfer writes remain blocked.

QA must verify:

- Employee Entry exposes From Bed, To Bed, Transfer Date, Reason, and Note for Bed Transfer.
- The context review block is visible and readable.
- Bed Transfer save is blocked with approval-required copy.
- Bed Transfer TF drafts cannot be exported/uploaded while `BED_TRANSFER_WRITE_ENABLED=false`.
- No occupancy, TTLock, deposit, arrears, financial formula, or dashboard calculation is changed by UI inspection.
- Production schema migration is still required before any real Bed Transfer write.
- No production write, write gate, migration, D1 execute/export/import, batch rollout, or production cutover is approved.

Production cutover remains `PRODUCTION_NO_GO`.

## Selected 3 TTLock Dispatch Blocker QA - 2026-06-01

- Selected TTLock rooms/beds `112`, `113`, and `125` are visible in the owner read SOT.
- Real dispatch is blocked until TTLock expired unpaid rows are materialized into the persisted directive write model.
- Do not expect Abdul inbox to show +3 from this audit.
- Do not retry production write until a separate TTLock materialization plan is approved and staged.
- Write gate remains off.
- No production D1 write, migration, D1 execute/export/import, batch dispatch, TTLock full rollout, financial formula change, or dashboard calculation change occurred.
- Production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-ENTRY-LAYOUT-PARITY-HARD-FIX-001 QA Addendum

The employee Follow-up page has been locally refactored to enforce hard Entry layout parity.

QA must verify after an approved deploy:

- Follow-up looks like Entry with different business content, not a separate page design.
- Header account/logout controls are compact and unified.
- Entry/Follow-up tabs are centered and equal-sized.
- Export remains removed.
- System Reminders and reminder follow-up list use Entry card/grid/form styling.
- Old Follow-up red-line cards are absent.
- Reminder cards are collapsed by default with details on demand.
- No production write, write gate, migration, D1 execute/export/import, batch dispatch, TTLock smoke, or cutover is approved.

Production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-ENTRY-PERFECT-PARITY-DEPLOY-001 QA Addendum

The employee Follow-up UI parity with Entry page has been deployed to the production Worker as a UI-only change.

QA must verify:

- Employee navigation has only `Entry` and `Follow-up`; no employee `Export` tab or page is visible.
- Header identity and logout controls are visually unified and not duplicated.
- Follow-up uses the same layout tokens as Entry: KPI cards, step cards, buttons, spacing, and compact density.
- Boss assigned task cards default to compact state and support expand/collapse.
- Default Follow-up cards do not show long customer codes, internal ids, raw source fields, or debug labels.
- System Reminders use the same visual system as Entry.
- Owner WhatsApp and owner arrears exports still work and were not removed.
- Authenticated mobile acceptance is still required after deploy.
- No production write, write gate, migration, batch dispatch, TTLock smoke, financial formula change, dashboard calculation change, or production cutover is approved.

Production cutover remains `PRODUCTION_NO_GO`.

## ARREARS-EMPLOYEE-INBOX-STATUS-COPY-MOBILE-ACCEPTANCE-001 QA Addendum

Mobile acceptance passed for the employee boss-assigned arrears task status-copy fix.

QA status:

- Abdul can see task `144 / 139780080 / 50.00 AED`.
- The task source displays as system existing arrears.
- Editing date or note shows `当前修改未提交`.
- With write gate off, submit shows `真实反馈写入未启用；当前不会写入生产。请先用 WhatsApp/线下回执。`
- No false success message appears while production write gate is off.
- Real employee feedback write remains blocked until separate production write approval.
- Production cutover remains `PRODUCTION_NO_GO`.

## Arrears Directive Count Mismatch QA Rule

- Employee Follow-up `ASSIGNED` count must equal persisted assigned directives from `/api/employee/arrears/directives`.
- Owner selected count / dry-run list count does not equal real dispatch count.
- With write gate off, owner batch action must not write to employee inbox.
- Current Abdul real production directive evidence is 1; any larger real rollout requires explicit approval.
- If QA sees owner dry-run count treated as employee-received count, classify as P1 misleading workflow bug.
- Production cutover remains `PRODUCTION_NO_GO`.

## ARREARS-EMPLOYEE-INBOX-STATUS-COPY-DEPLOY-001 QA Addendum

The employee boss-assigned arrears task status-copy fix has been deployed to the production Worker as a UI/copy-only change.

QA must verify:

- Employee boss-assigned task cards use `已有反馈` for existing feedback.
- Editing promised date or note shows `当前修改未提交`.
- With write gate off, submit shows `真实反馈写入未启用；当前不会写入生产。请先用 WhatsApp/线下回执。`
- No real feedback write occurs without separate production write approval.
- This deployment does not approve owner directive create, employee follow-up write, batch dispatch, TTLock smoke, migration, public rollout, or production cutover.
- Production cutover remains `PRODUCTION_NO_GO`.

## TTLOCK-ARREARS-SOURCE-FIX-001 QA Addendum

Owner arrears QA must validate:

- Only two source classes are visible: system arrears and TTLock expired unpaid.
- TTLock expired unpaid enters the arrears pool when live data and rent mapping are available.
- TTLock amount comes from bed-rent mapping.
- TTLock unavailable is not accepted as a successful end state.
- TTLock source failure does not block system arrears.
- Production cutover remains `PRODUCTION_NO_GO`.

## ARREARS-ROOT-CAUSE-LOCK-001 QA Addendum

Owner arrears QA must validate source completeness, not just visual rendering:

- `historical_arrears` rows are present.
- `current_due_unpaid` rows are present.
- `ttlock_expired_card` rows are present.
- Unknown amount TTLock rows display `金额待核对`.
- Owner overview still has no quick-entry section.
- Owner nav does not wrap the network entry to a second row.

No production cutover is approved. Production remains `PRODUCTION_NO_GO`.

## AUTH-ROUTING-ARCHITECTURE-001 Entry Update

All testers start from the root URL only:

`https://homelink-finance.habibramadan888.workers.dev/`

The page presents three doors: employee, owner, and administrator. `/unified-login.html`, `/employee-v3.html`, and `/index.html` remain compatibility paths, not formal user instructions. If any old PIN login or old owner login appears, record it as a P0/P1 auth-routing bug. Full write testing still requires separate approval. Production cutover remains `PRODUCTION_NO_GO`.

Date: 2026-05-28, Asia/Dubai

Scope: internal QA planning with one unified login page. Testers must start
from `unified-login.html` and allow the server-confirmed role to route them.
`employee-v3.html` and `index.html` are business destinations, not separate
login pages. This plan does
not approve public beta, production migration, production deploy, production D1
write, production feature flags, dashboard production authority switch, or
commercial launch.

## Environment

| Item                           | Value                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| QA package environment         | Internal QA planning; not production approval                                              |
| Unified login URL              | `https://homelink-finance.habibramadan888.workers.dev/unified-login.html`                  |
| Employee business destination  | `https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`                    |
| Owner business destination     | `https://homelink-finance.habibramadan888.workers.dev/index.html`                          |
| Staging Worker URL             | `https://homelink-finance-staging.habibramadan888.workers.dev`                             |
| Current Worker D1 binding risk | `homelink-finance` is configured with `DB = homelink`; writes affect prod                  |
| Production used?               | Live Worker static route deploy executed under explicit approval; no D1 write or migration |
| Production equivalent?         | No                                                                                         |
| Production cutover status      | `PRODUCTION_NO_GO`                                                                         |
| Test data policy               | QA-marked evidence only; no production writes without separate approval                    |
| Password / token handling      | Never paste into docs, screenshots, tickets, or chat                                       |
| Live unified-login route       | Verified HTTP 200 `text/html` in `INTERNAL_QA_005B_UNIFIED_LOGIN_LIVE_SMOKE_RESULT.md`     |
| Live session handoff assets    | Verified deployed in `INTERNAL_QA_005D_SESSION_HANDOFF_LIVE_SMOKE_RESULT.md`               |

## Roles

| Role          | Purpose                                                      | Account Handling                                                           |
| ------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| employee      | Staff entry, rent/deposit/arrears/handover flows             | Start at unified login; no write test unless target is explicitly approved |
| owner         | Dashboard, history, reports, reconciliation, review flows    | Start at unified login; no production write or cutover approval            |
| manager/admin | Tenant/property permission boundary checks if account exists | Start at unified login; use only if target scope is explicitly approved    |

## Test Cycle

| Round   | Focus                                   | Required Output                                                           | Pass Standard                                                                     |
| ------- | --------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Round 1 | Functional usability                    | Employee and owner scripts completed                                      | Core pages load, login/logout works, no P0/P1 functional blocker                  |
| Round 2 | Financial flows                         | Evidence for rent, deposit, arrears, short-pay, repayment, void, handover | Amounts and status changes are explainable and match expected accounting rules    |
| Round 3 | Permissions / exceptions / weak network | Negative cases, duplicate submit, mobile, refresh/back navigation         | Unauthorized access denied, duplicate/weak-network behavior safe, no data leakage |

## Pass Criteria

| Area                  | Pass Criteria                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Employee flow         | Rent, deposit, arrears, short-pay, repayment, void, and handover scenarios are completed or have documented blockers.  |
| Owner flow            | Dashboard, history, search/filter, handover review, and report/export behavior are reviewed with screenshots or notes. |
| Unified login handoff | Owner and employee each log in once through unified login; no second password/PIN prompt appears after routing.        |
| Unified login visual  | `unified-login.html` matches the original employee login background, card, input, button, type, and mobile layout.     |
| Unified design system | Owner and employee use the same font, button, input, card, loading, and mobile visual language.                        |
| Finance flow          | Rent income, deposit liability, arrears, overdue, overpayment, and void behavior match the accepted staging rules.     |
| Tenant/property scope | Employee, owner, and manager/admin access is constrained to expected tenant/property boundaries.                       |
| Mobile usability      | Required employee and owner flows are usable on phone viewport.                                                        |
| Bug threshold         | No open P0/P1 bug remains before closed-pilot recommendation.                                                          |
| Launch boundary       | Production remains `PRODUCTION_NO_GO`; internal QA does not become public beta or launch approval.                     |

## Failure Handling

| Failure Type                                                            | Required Action                                                                                                      |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| P0 financial or data corruption risk                                    | Stop the affected flow, create bug report, notify Ramadan Habib, and do not continue related tests until triaged.    |
| P1 permission or cross-tenant risk                                      | Stop permission testing, preserve evidence, create bug report, and keep production NO-GO.                            |
| P2 functional defect                                                    | Record steps, expected/actual result, screenshot, and continue unrelated tests if safe.                              |
| P3 usability issue                                                      | Record notes and screenshots; group for later UI cleanup.                                                            |
| Unclear accounting behavior                                             | Mark `MANUAL_REQUIRED`; do not invent pass/fail.                                                                     |
| Second login after unified login                                        | Record as a unified-login handoff bug; do not continue role-flow testing until triaged.                              |
| Owner login flicker or back-loop                                        | Record as a unified-login UX bug. Expected behavior is auth-loading first and signed-in panel on browser back.       |
| Owner visually looks old                                                | Record as a P1 UX bug if the owner UI no longer appears to belong to the same product as employee.                   |
| Owner mobile layout is cramped                                          | Record as P1 if it blocks core use, P2 if readable with workaround.                                                  |
| Owner primary nav shows `录入`                                          | Record as P1 UX/IA bug; owner entry must not appear as a main tab or homepage action.                                |
| Owner topbar icon/text is garbled                                       | Record as P1 UX bug and attach phone screenshot.                                                                     |
| Owner right-side topbar overflows                                       | Record as P1 if it blocks use, P2 if cosmetic but readable.                                                          |
| Successful live login smoke                                             | Requires separate approval because successful login writes production D1 `active_sessions`.                          |
| Login page shows production/D1/cutover/role-routing technical text      | Record as P1 UX bug; visible login UI must stay minimal and user-facing.                                             |
| Login page shows helper paragraphs, route explanations, or second cards | Record as P1 UX bug; the visible login page may show only logo, title, username, password, login, and clear session. |

## Evidence Rules

| Evidence Type      | Required Content                                        | Redaction                                                          |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------ |
| Screenshot         | Page, role, date/time, masked tenant/customer if needed | Mask passwords, tokens, cookies, personal phone numbers if visible |
| Video              | Only if a bug needs sequence proof                      | No credentials or tokens visible                                   |
| Export/report file | Store as staging QA evidence only                       | Do not upload production data                                      |
| Bug report         | Use `BUG_REPORT_TEMPLATE.md`                            | No secrets or passwords                                            |

## Explicit Non-Goals

| Non-Goal                    | Reason                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Production deploy           | Not approved.                                                                                                               |
| Production migration        | Not approved.                                                                                                               |
| Production D1 write         | Not approved.                                                                                                               |
| Staging D1 write from Codex | This package is documentation only; manual QA may create QA-marked staging evidence through the app if separately approved. |
| Public beta                 | Internal QA is not public beta.                                                                                             |
| Commercial launch GO        | Launch gate remains `PRODUCTION_NO_GO`.                                                                                     |

## Owner UX Stabilization Checks

| Check               | Expected Result                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remember account    | Login page may remember username / employee ID / owner account only. Password remains empty on reload.                                               |
| Password storage    | If the app stores password / PIN in localStorage or sessionStorage, stop and open a P0 security bug.                                                 |
| Clear session       | Clears active session/token state and password field. Remembered account is preserved only when `记住账号` remains checked.                          |
| Owner topbar        | The visible `老板` badge should not appear; permissions still come from the server session.                                                          |
| Overview value      | Owner can see today's received amount, outstanding amount, pending item signal, latest handover status, alert summary, recent flow, and quick links. |
| History performance | First paint shows skeleton quickly; initial history request loads recent records first with a load-more path.                                        |
| Mobile density      | Page title, nav, cards, and lists are compact enough for mobile business review without reverting to old UI.                                         |

## Auth Routing Stabilization Checks

| Check                | Expected Result                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Single-entry routing | All unauthenticated role destinations route to `unified-login.html`; no legacy owner or employee login panel flashes.     |
| Role destination     | Server-confirmed employee/staff sessions route to `employee-v3.html`; owner/manager/admin sessions route to `index.html`. |
| Lock/logout routing  | Lock and logout clear session state and route to `unified-login.html`, not to old login UI.                               |
| Employee identity    | Employee UI displays display name, username, or employee id; `staff` is treated as a role, not a display name.            |
| Network control      | Owner WiFi/network entry is present in the owner navigation or recorded as manual-required.                               |
| History performance  | Owner history shows skeleton/loading quickly and loads recent records first instead of blocking on full history.          |

If any auth route flashes an old login panel, routes through the wrong role
destination, or shows `staff` as the visible employee name, record a P1 bug and
pause role-flow QA until retested. Production cutover remains
`PRODUCTION_NO_GO`.

## Owner Real Screenshot Regression Stop Items

| Regression                                           | Required Handling                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Owner primary nav shows `录入`                       | Record as P1 UX/IA bug; owner entry must not be a main tab.                                             |
| Owner topbar icon/text is garbled                    | Record as P1 UX bug and attach phone screenshot.                                                        |
| Owner homepage shows `添加记录 ADD ENTRY`            | Record as P1 UX/IA bug; employee entry must not be exposed as an owner homepage block.                  |
| Owner homepage shows `现金收款` / `银行转账` buttons | Record as P1 UX/IA bug; payment entry actions belong to employee entry flow unless separately approved. |

## AUTH-UI-STABILIZATION-002 Scope

- Confirm the unified login is the only visible login flow.
- Confirm unauthenticated owner and employee business pages redirect to unified login.
- Confirm lock/logout does not route to old employee PIN login or old owner login.
- Confirm employee identity displays the actual user, for example `abdul`, not `staff`.
- Confirm employee top tabs use one consistent Chinese-over-English layout.
- Confirm owner control panel and arrears detail modal are readable on mobile.
- Confirm owner history shows skeleton feedback quickly and loads recent records first.
- Confirm WiFi/network entry is present or explicitly marked manual-required.
- Do not perform employee entry write, handover submit, void/delete, settings changes, D1 write, or migration.
- Production cutover remains `PRODUCTION_NO_GO`.

## INTERNAL-QA-BLOCKERS-003 Acceptance Addendum

- Employee identity: display real user name only; `staff` is a role and must never be shown as a person name.
- Script errors: any visible `Script error.` toast during employee initial render is a P1 blocker.
- Arrears export: exported text must start with summary, include generated time/count/aging buckets, and use `金额未接入` when amount authority is not connected.
- Arrears modal: mobile layout must use compact rows, not oversized cards that show only one customer per screen.
- Login password manager: browser autocomplete is allowed; app-owned plaintext password/PIN storage is forbidden.
- Readonly admin: can view owner dashboard/history/clients/analysis; all write actions must be disabled in UI and rejected by backend.
- Production remains `PRODUCTION_NO_GO`; no internal QA result is production approval.

## THREE-PORTAL-FIX-001 Entry Model Regression

QA must verify the formal `/` entry surface has only three role doors:

- 员工
- 老板
- 管理员

欠款管理 is not an entry identity and must not appear as a fourth card on the main portal. Validate arrears only after login:

- Owner: arrears management in owner workspace.
- Employee: assigned arrears follow-up tasks in employee workspace.
- Readonly admin: owner/admin arrears view remains read-only.

Run `npm run test:three-portal-entry-cards` before visual acceptance. Production cutover remains `PRODUCTION_NO_GO`.

# OWNER-PAGE-REGRESSION-LOCK-001 Addendum

Date: 2026-05-30, Asia/Dubai

Owner QA must include these non-negotiable UI composition checks:

- Overview page prohibits `QUICK ACTIONS` / `快速进入`.
- Overview page must not duplicate history/customer/analysis/network shortcut buttons.
- Arrears management is an owner-internal module and must not appear as a fourth login door.
- Owner internal navigation must keep the `欠款管理` entry visible.
- The arrears information pool must show `欠款管理`, `ARREARS FOLLOW-UP`, status KPIs, `下发员工`, `WhatsApp 导出`, `筛选状态`, task status, responsible staff, promised repayment date, and notes.
- If `QUICK ACTIONS` appears or arrears entry disappears, classify it as a regression bug.

## Owner Arrears Final UX QA Addendum

Owner arrears QA must validate the final source and visual contract:

- Allowed sources are exactly two: system existing arrears records and TTLock expired unpaid.
- TTLock expired unpaid must use bed rent mapping for amount; beds without rent config are configuration QA and do not enter the default list.
- Owner default card content is limited to employee promised amount, promised date, and note, alongside identity/source/status/due context.
- Arrears visual style must match the history page card system. Old outstanding rows/tables, vertical text, or debug output are regressions.
- Top navigation must show `欠款`; `欠款管理` is too long for mobile primary nav.
- A 20-second blank/load stall is a P1 blocker.
- Raw debug fields are regression blockers.

Production cutover remains `PRODUCTION_NO_GO`.

## Arrears Follow-Up Field Simplification

QA must verify:

- System, not employee, determines arrears amount.
- Employee only enters promised repayment date and note for follow-up.
- Owner default arrears card shows system amount, promised date, note, and status.
- `promise_amount` / `promised_amount_fils` may exist in compatibility contracts but are not default UI fields.
- Any reappearance of `承诺金额` on default owner arrears cards is a regression.
- Production cutover remains `PRODUCTION_NO_GO`.

## Owner Regression Audit QA Addendum

Owner QA must treat these as blockers:

- Missing `分析` entry.
- Owner arrears `signal is aborted without reason`.
- Any owner module unreachable after login.
- Owner shell changes without `npm run test:owner-regression-smoke`.

Required module smoke: 总览, 欠款, 历史, 分析, 客户, 网络.

Production cutover remains `PRODUCTION_NO_GO`.

## Owner Arrears Overview Merge QA Addendum

Owner QA must validate the new product decision:

- Arrears is merged into overview and must not be a top-level owner tab.
- Overview must contain `欠款跟进`.
- Arrears loading must close to success, empty, error, or timeout; infinite loading is a blocker.
- Arrears timeout/error must show retry inside the module only.
- Arrears failure must not affect overview KPIs, alerts, recent sessions, or recent ledger.
- 20s+ loading is P1.
- 3-minute loading is P0/P1.

Required commands:

- `npm run test:owner-arrears-infinite-loading`
- `npm run test:owner-overview-arrears-async`
- `npm run test:owner-overview-arrears-timeout`
- `npm run test:owner-nav-after-arrears-merge`
- `npm run test:owner-arrears-two-source-only`

Production cutover remains `PRODUCTION_NO_GO`.

## Owner Arrears Loading / Navigation Blockers

- 欠款模块无限 loading 是 P1/P0 blocker。
- 欠款模块必须有状态闭环：loading、success、empty、partial failure、error、retry。
- 欠款来源必须独立失败隔离，避免 TTLock 或 rent mapping 单点拖垮系统已有欠款。
- 顶部导航禁止横向滚动；不能通过左右滑来塞入口。
- 欠款不作为一级 Tab，只在总览里展示。
- Production cutover remains `PRODUCTION_NO_GO`.
## Owner Arrears Batch Display / Export QA Addendum

- Verify arrears page supports select-all within the current source filter.
- Verify directive date is removed from owner arrears action bar.
- Verify filters are exactly: all, TTLock expired, existing arrears.
- Verify cards are collapsed by default and details show promise date, note, and status.
- Verify WhatsApp export is usable and has manual fallback.
- Verify send-employee remains dry-run until explicit write approval.
- Verify D1 write is No.
- Verify production cutover remains `PRODUCTION_NO_GO`.

## WhatsApp Arrears Export Final Baseline

- Verify final format: `Due M/D | N overdue`, `---`, room/bed group, task rows.
- Verify urgent marker uses `*` instead of emoji.
- Verify customer code and bed searches are continuous and searchable.
- Verify raw `source_type`, `ttlock_card`, `rent`, `deposit`, and internal ids are absent.
- Verify selected rows export only selected rows.
- Verify no-selection export uses current source filter.
- Verify export text is generated once and not duplicated.
- Production cutover remains `PRODUCTION_NO_GO`.
# Acceptance Bugfix QA Addendum - 2026-05-31

- Batch arrears select-all must enable the send button from selected checkbox state.
- Batch send remains dry-run until real employee directive delivery receives separate approval.
- WhatsApp live export must keep searchable continuous codes and no raw/debug terms.
- Clipboard and share fallback text must be the same string.
- Three portal card text alignment is a P2 visual acceptance check.
- Production cutover remains `PRODUCTION_NO_GO`.
## Acceptance Bugfix Deployment QA Addendum - 2026-05-31

- Deployment target: `homelink-finance`, Worker version `73517bf9-df6e-47e1-a72f-9743264ee934`.
- Re-run owner mobile acceptance against the deployed Worker, not only local harness tests.
- Required acceptance:
  - Select-all enables send-employee for owner/manager when at least one task is selected.
  - Send-employee displays dry-run list only and does not write D1.
  - WhatsApp live button uses final baseline export.
  - Selected rows export selected rows; no selection exports current filtered rows.
  - Clipboard/share/fallback text is identical.
  - Portal cards remain exactly three and visually aligned.
- Required safety:
  - D1 write = No.
  - Migration = No.
  - Business write = No.
  - Production cutover = `PRODUCTION_NO_GO`.
## Arrears Real Directive Delivery Closure QA - 2026-05-31

- Dry-run must not be accepted as real employee delivery.
- Real directive delivery requires persistent directive state.
- Employee must read assigned directives.
- Employee feedback must include promised payment date and note only.
- Owner must see employee feedback.
- WhatsApp export must use the user-verified searchable format.
- Production write requires separate approval.
- Production cutover remains `PRODUCTION_NO_GO`.

## Arrears Directive Owner/Employee Closure - 2026-05-31

- Owner dispatch dry-run must not be treated as real employee delivery.
- Employee FOLLOW-UP must read boss directives from `/api/employee/arrears/directives`.
- Boss directive inbox and system reminders must be visually and logically separated.
- Employee directive follow-up must only collect promised date and note.
- Production write gate remains off unless explicitly approved.
- Any future change to this flow must run:
  - `npm run test:arrears-owner-send-status-gating`
  - `npm run test:employee-arrears-inbox-data-source`
  - `npm run test:employee-arrears-directive-inbox-ui`
  - `npm run test:employee-arrears-directive-read-ui`
  - `npm run test:employee-arrears-followup-ui-gate`

## Arrears Employee Inbox UI Live Deploy QA - 2026-05-31

- Owner dry-run copy is deployed and must remain distinct from real delivery.
- Employee boss directive inbox UI is deployed but requires authenticated phone acceptance because employee routes redirect without login.
- Write gate off means no real employee directive is created by owner dry-run.
- Real production delivery still requires rollout approval.
- Production cutover remains `PRODUCTION_NO_GO`.

## Abdul One-Task Follow-up Write QA - 2026-06-01

- Approved production write scope was exactly one employee follow-up on `task-mpgzu9kp-f150e26f`.
- Verify employee side shows promised payment date `2026-06-10` and the approved follow-up note.
- Verify owner side shows the same promised date and note.
- Verify amount remains `50 AED`, `actual_received` remains `0`, and accounting status remains unchanged.
- Verify write gate is closed after the acceptance write.
- Verify no batch dispatch, TTLock smoke, owner directive create, migration, deploy, financial formula change, or dashboard calculation change occurred.
- Production cutover remains `PRODUCTION_NO_GO`.

## Persisted Follow-up State Regression QA - 2026-06-01

- Saved feedback and unsaved edits must be separate states.
- Write gate off must not imply previously saved feedback failed.
- Only unsaved changes should show gated-warning copy.
- Owner cards for assigned/followed-up tasks must not continue to show a primary clickable `下发员工` action.
- This QA does not authorize production writes, migration, deploy, TTLock smoke, or batch dispatch.
- Production cutover remains `PRODUCTION_NO_GO`.

## Live Persisted State UI Deploy QA - 2026-06-01

- Live asset markers are now required before phone acceptance:
  - `/employee-v3` contains `serverOriginalPromisedDate`, `serverOriginalFollowupNote`, `updateEmployeeDirectivePersistedState`, and `employeeDirectiveIsDirty`.
  - `/index-51-main.js` contains `assigned-state` and `followed-up-state`.
- Saved feedback must not show write-gate-off warning when date/note are unchanged.
- Only dirty unsaved date/note edits may show the gated warning while write gate is off.
- Owner assigned/followed-up tasks must show read-only state buttons, not clickable primary `下发员工`.
- No production business write, write gate opening, migration, owner directive write, employee follow-up write, batch dispatch, TTLock smoke, financial formula change, or dashboard calculation change is authorized by this QA.
- Production cutover remains `PRODUCTION_NO_GO`.

## Internal Full Acceptance Phase - 2026-06-01

- Internal full acceptance is now the active validation stage.
- This stage is not production cutover and not public beta.
- Use `INTERNAL_FULL_ACCEPTANCE_CHECKLIST.md` as the master checklist.
- Use `INTERNAL_ACCEPTANCE_BUG_TRIAGE_RULES.md` to classify P0/P1/P2/P3 issues before fixing.
- Use role scripts:
  - `OWNER_INTERNAL_ACCEPTANCE_SCRIPT.md`
  - `EMPLOYEE_INTERNAL_ACCEPTANCE_SCRIPT.md`
  - `ADMIN_INTERNAL_ACCEPTANCE_SCRIPT.md`
- Use `MOBILE_ACCEPTANCE_SCREENSHOT_TEMPLATE.md` for every uploaded phone screenshot.
- Use `INTERNAL_ACCEPTANCE_FIX_BATCH_PLAN.md` to group fixes and avoid random mixed-module changes.
- existing_arrears production minimal smoke has passed.
- Abdul single-task follow-up write has passed.
- TTLock production smoke is not tested.
- Batch rollout is not approved.
- Write gate remains off by default.
- Production cutover remains `PRODUCTION_NO_GO`.

## Employee Follow-up Simplified Bilingual UI QA - 2026-06-01

- Employee FOLLOW-UP page follows the efficient execution principle: task first, details on demand.
- Header identity and logout are split: one employee identity display, one `Logout / 退出` button.
- Boss assigned task cards default to minimal fields only: bed, amount, due date, status, expand action.
- `customer_code` is not shown by default on employee task cards.
- Cards support `Expand Details / 展开详情` and `Collapse Details / 收起详情`.
- Expanded details show promise date and note only; no promised amount or amount edit.
- Core employee-facing copy is English-first bilingual.
- No production write, write gate opening, migration, batch dispatch, TTLock smoke, financial formula change, or dashboard calculation change is authorized by this QA.
- Production cutover remains `PRODUCTION_NO_GO`.

## Live Persisted State Audit QA - 2026-06-01

- If phone acceptance still shows the old warning, first inspect live assets for the `223cbbb` UI markers.
- Missing markers mean the fix is not deployed, not that another follow-up write is needed.
- Date comparison must normalize equivalent dates such as `2026-06-10` and phone-displayed `2026/06/10`.
- Note comparison must trim whitespace.
- All employee boss directive renderers must use the same saved/dirty state model.
- Owner followed-up tasks must not show clickable primary `下发员工`.
- Production cutover remains `PRODUCTION_NO_GO`.
## EMPLOYEE-FOLLOWUP-MATCH-ENTRY-UX-001

QA scope:

- Verify employee tabs show only Entry and Follow-up.
- Verify no visible employee Export page or Export tab.
- Verify Follow-up cards use the same card radius, padding, buttons, and typography as Entry.
- Verify employee name and Logout controls use matching styles.
- Verify boss assigned tasks show compact fields by default and details on expand.
- Verify old employee export route lands in Follow-up.
- Verify boss WhatsApp/arrears export remains unaffected.
- Verify no production write and write gate remains off.
- Verify production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-MATCH-ENTRY-UX-DEPLOY-001

Live Worker version: `bae1241e-ac4b-4747-bebe-a4bb4a9bd00f`.

Deployment QA scope:

- Verify deployed employee UI shows only Entry and Follow-up.
- Verify employee Export tab/page remains absent.
- Verify Follow-up visual system matches Entry page cards, spacing, buttons, and typography.
- Verify Details / Collapse works on boss-assigned task cards.
- Verify the visible header has employee identity plus `Logout / 退出`.
- Verify owner arrears WhatsApp/export behavior remains intact.
- Authenticated phone acceptance is required because Codex only performed public asset smoke.
- No production write, migration, D1 execute/export/import, owner directive create, employee follow-up write, batch dispatch, TTLock smoke, dashboard calculation change, or financial formula change is approved by this deploy.
- Production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-FULL-UX-PARITY-WITH-ENTRY-001

QA scope:

- Entry is the only visual and interaction source of truth for employee pages.
- Follow-up must use the same card, section, KPI, form, and button primitives as Entry.
- Header identity and Logout must share the same visual system.
- Boss Assigned Tasks must be collapsed by default and show only high-value execution information.
- System Reminders must use Entry-style sections and cards, not a separate reminder UI.
- `customer_code`, technical/internal text, `existing_arrears_record`, raw source fields, and long instructions must not face employees by default.
- Employee Export visible tab/page remains removed.
- No production write, write gate opening, migration, batch dispatch, TTLock smoke, financial formula change, or dashboard calculation change is authorized.
- Production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-ENTRY-HARD-PARITY-DEPLOY-001 QA Addendum

The employee UI-only hard parity fix is deployed to Worker version `5d949970-115e-4208-8a39-dac981c4bf61`.

QA must verify:

- Employee `/employee-v3` opens and renders the current hard parity asset.
- Header compact parity is visible on mobile.
- Entry / Follow-up nav is centered, does not wrap, and does not show Export.
- Follow-up body uses Entry-style cards, spacing, and controls.
- System Reminders are Entry-style and collapsed by default.
- Details / Collapse works without any production write.
- Owner WhatsApp export remains available.
- Authenticated mobile acceptance is manual required before closing the UI bug.
- No production write gate, D1 write, migration, batch dispatch, TTLock smoke, financial formula change, or dashboard calculation change is authorized by this deploy.
- Production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-BOSS-CARD-COMPACT-UI-001 QA Addendum

The boss-assigned task card on employee Follow-up is locally compacted.

QA must verify:

- Employee sees only execution-critical fields by default.
- Expanded card shows only Promise Date, Note, and Save.
- Helper/source/boss-note blocks are removed from the employee task card.
- Note defaults blank when there is no saved note.
- Known QA/demo smoke note text is not prefilled.
- Button state is simple: `Saved / 已保存` for unchanged saved feedback, `Save / 保存` for new/edited feedback.
- No production write, write gate opening, migration, D1 execute/export/import, financial formula change, or dashboard calculation change is authorized.
- Deploy is not included unless separately approved.
- Production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-BOSS-CARD-COMPACT-DEPLOY-001 QA Addendum

The compact boss-assigned employee Follow-up card is deployed to Worker version `1ef96378-7259-4605-ac46-7e5dfe169488`.

QA must verify:

- Employee Follow-up expanded state is compact.
- Helper/source/boss-note blocks are removed.
- Expanded state only keeps Promise Date, Note, Save, and Collapse.
- Note defaults blank when no saved non-QA note exists.
- Blank note does not override old notes.
- Owner WhatsApp and arrears exports are not deleted.
- No production write, write gate opening, D1 execute/export/import, migration, batch dispatch, TTLock smoke, financial formula change, or dashboard calculation change is authorized by this deploy.
- Production cutover remains `PRODUCTION_NO_GO`.

## ARREARS-DIRECTIVE-FULL-INTERNAL-TEST-REAL-DISPATCH-001 QA Addendum

Mixed-source directive materialization is implemented and staging TTLock fixture E2E has passed. Production full dispatch is not authorized yet because production read-only preflight found 46 current SOT tasks, not the expected 40.

QA must verify before any later write approval:

- The target dispatch count is explicitly approved as 46 or a filtered target list is provided.
- `existing_arrears_record` and `ttlock_expired_unpaid` remain the only dispatchable source types.
- Abdul assignment target is confirmed.
- Production write gate is opened only for the approved dispatch window and closed immediately afterward.
- No employee follow-up batch write, TTLock smoke, financial formula change, dashboard calculation change, or production cutover is included.
- Production cutover remains `PRODUCTION_NO_GO`.

## Employee Follow-up System Reminder Count and Phone-Hide Acceptance

- System Reminders must count by active business source type.
- `ttlock_expired_unpaid` must appear under TTLock Overdue, not Arrears.
- `existing_arrears_record` must appear under Arrears.
- Boss Assigned count must remain separate from System Reminders.
- Employee default task card titles must hide TTLock account phone identifiers such as `+971...`.
- Raw TTLock data, `source_ref`, and dedupe/materialization fields must not be deleted or changed.
- This is a UI/count classification fix only; no production write, migration, deploy, financial formula change, or dashboard calculation change is included.
- Production cutover remains `PRODUCTION_NO_GO`.

Deployment acceptance update:

- Worker version `5db7d12a-6b54-4ed2-ba79-f2eee35c19f7` was deployed for the employee System Reminders count and TTLock phone-hide UI fix.
- Live read-only verification found Abdul Boss Assigned `46`, TTLock Overdue `41`, Arrears `5`.
- Boss owner export functions remain present.
- No production business write, migration, write gate opening, batch dispatch, TTLock smoke, financial formula change, dashboard calculation change, or production cutover was performed.
- Production cutover remains `PRODUCTION_NO_GO`.

Owner overview comparative BI QA update:

- Owner overview now has an additive read-only comparative BI panel.
- QA must verify month-to-date, quarter-to-date, last-month, and same-month-last-year context.
- QA must verify accounting separation: rent, deposits, arrears recovery, deposit refund, expenses, and net cashflow.
- QA must verify occupancy flow: new tenants, checkouts, bed transfers, with transfers excluded from new/checkouts.
- QA must verify no production write, migration, financial formula change, dashboard calculation change, or production cutover.
- Production cutover remains `PRODUCTION_NO_GO`.

Employee navigation split QA update:

- Employee navigation must show Entry, Follow-up, and System only.
- Follow-up must show only Boss Assigned Tasks from persisted directive rows.
- System must show System Reminders, including Required, TTLock Overdue, Arrears, and Amount reminders.
- Export must remain removed; `#export` may only redirect to Follow-up.
- System Reminders count logic and source classification are unchanged.
- No production write, write gate opening, migration, deploy, employee follow-up write, owner directive create, batch dispatch, TTLock smoke, financial formula change, dashboard calculation change, or production cutover is authorized by this QA item.
- Production cutover remains `PRODUCTION_NO_GO`.

Bed Transfer accounting closure QA update:

- Bed Transfer must include `from_bed` and `to_bed`; a single generic bed field is insufficient.
- Deposit liability follows the customer and is not revenue.
- Carry-over arrears do not disappear during transfer.
- Old TTLock records must be retained and linked to the transfer trace.
- Bed Transfer is not new tenant and not checkout.
- Bed Transfer creates statistical anchors such as monthly/quarterly transfer counts, reason distribution, and transfer-with-arrears counts.
- No production write, production migration, deploy, financial formula change, dashboard calculation change, or production cutover is authorized by this QA item.
- Production cutover remains `PRODUCTION_NO_GO`.
## Bed Transfer Fee Ledger QA

| Area | Expected |
|---|---|
| Charged transfer | 50 AED recorded as `bed_transfer_fee` |
| Waived transfer | 0 AED recorded with required waiver reason |
| Entry event | `event_type=bed_transfer` with fee anchors |
| Bed transfer event | linked transfer record with from/to/date/fee mode |
| Owner view | fee, waiver, entry event id, audit id visible |
| Owner review | no approve/reject workflow |
| Occupancy | unchanged |
| Deposit | unchanged |
| Arrears | unchanged |
| TTLock | unchanged |
| Production cutover | `PRODUCTION_NO_GO` |

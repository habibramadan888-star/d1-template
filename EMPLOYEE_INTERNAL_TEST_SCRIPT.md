# Employee Internal Test Script

## Selected 3 TTLock Dispatch Audit - 2026-06-01

1. Do not expect Abdul inbox to show new `112`, `113`, or `125` tasks from this audit.
2. The selected TTLock rows were blocked before production write because they are read-model virtual rows, not confirmed persisted directive rows.
3. Abdul's persisted directive inbox count remains the real API count and must not be inflated by owner TTLock dry-run rows.
4. Production write gate remains off.
5. Production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-ENTRY-LAYOUT-PARITY-HARD-FIX-001 Employee Checks

Date: 2026-06-01, Asia/Dubai

This local fix requires Follow-up to match the Entry page layout system, not a separate Follow-up visual system.

Manual employee QA after an approved deploy should confirm:

- Abdul/account and `Logout / 退出` controls are compact, same-size, and not visually dominant.
- `Entry` and `Follow-up` tabs are centered and equal-sized.
- Employee `Export` tab/page is still absent.
- Boss Assigned Tasks use compact Entry-style task cards.
- System Reminders use Entry-style KPI cards.
- Reminder follow-up cards are not old red-line cards.
- Reminder follow-up cards are collapsed by default and expand to show status/date/note/actions.
- Buttons, inputs, selects, cards, radius, spacing, and typography match Entry.
- No production write should be attempted during visual QA unless separately approved.

Production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-ENTRY-PERFECT-PARITY-DEPLOY-001 Employee Checks

Date: 2026-06-01, Asia/Dubai

The employee Follow-up UI parity with Entry page is deployed to production Worker version `e839de0d-3740-4494-9703-8bc8137b11bd`.

Manual employee QA should confirm:

- Employee top navigation shows only `Entry` and `Follow-up`; there is no `Export` tab.
- Legacy employee export page is not available as an employee workflow.
- Header shows one employee identity display and one explicit `Logout / 退出` action.
- Follow-up page uses the same visual density, card rhythm, and controls as Entry.
- Boss assigned task card opens in compact/default state and uses `Expand Details / 展开详情`.
- Expanded task card can be collapsed with `Collapse Details / 收起详情`.
- Default task card does not show long customer code, internal ids, or debug fields.
- System Reminders use the same Entry-style card treatment.
- Saved, unsaved, and write-gated states remain distinguishable.
- No production write should be attempted during visual QA unless separately approved.

Production cutover remains `PRODUCTION_NO_GO`.

## ARREARS-EMPLOYEE-INBOX-STATUS-COPY-MOBILE-ACCEPTANCE-001 Employee Acceptance

Date: 2026-06-01, Asia/Dubai

Mobile acceptance passed for Abdul's employee boss-assigned arrears task inbox.

- Abdul can open the employee FOLLOW-UP page.
- Abdul can see the boss-assigned task `144 / 139780080 / 50.00 AED`.
- Editing promised date or note shows `当前修改未提交`.
- With write gate off, submit shows `真实反馈写入未启用；当前不会写入生产。请先用 WhatsApp/线下回执。`
- No false success message was observed.
- Real employee follow-up write still requires separate production write approval.
- Production cutover remains `PRODUCTION_NO_GO`.

## ARREARS-EMPLOYEE-INBOX-STATUS-COPY-DEPLOY-001 Employee Checks

Date: 2026-05-31, Asia/Dubai

The employee boss-assigned arrears task status-copy fix is deployed to production Worker version `8307d5e9-c209-4789-8d1d-9664cbbd5fcc`.

Manual employee QA should confirm:

- Existing historical feedback shows `已有反馈`, not a misleading new-submit success state.
- Editing promised payment date or note changes the visible state to `当前修改未提交`.
- With production write gate off, pressing submit shows `真实反馈写入未启用；当前不会写入生产。请先用 WhatsApp/线下回执。`
- Submit must not show success while the write gate is off.
- Real employee follow-up write still requires separate production write approval.
- Production cutover remains `PRODUCTION_NO_GO`.

## ARREARS-DIRECTIVE-ABDUL-REAL-INBOX-ROLLOUT-001 Employee Acceptance

Date: 2026-05-31, Asia/Dubai

Abdul's production employee arrears directive inbox was validated with exactly one approved existing arrears task.

| Check | Expected |
|---|---|
| employee inbox contains `task-mpgzu9kp-f150e26f` | yes |
| task source | existing system arrears |
| amount | 50 AED |
| promised payment date submitted | 2026-06-01 |
| follow-up note submitted | yes, QA note only |
| employee entry write | no |
| handover submit | no |
| TTLock production dispatch | not run |
| batch dispatch | not run |
| production cutover | PRODUCTION_NO_GO |

Do not run additional employee write tests against production unless separately approved.

## AUTH-ROUTING-ARCHITECTURE-001 Entry Update

Employee testers must start at `https://homelink-finance.habibramadan888.workers.dev/`, choose the employee door, then authenticate. Do not start from `/employee-v3.html`; it is a compatibility alias to `/employee`. Old PIN login UI must not appear. Production cutover remains `PRODUCTION_NO_GO`.

Date: 2026-05-27, Asia/Dubai

Scope: employee manual QA planning through the single unified login. Start from
`https://homelink-finance.habibramadan888.workers.dev/unified-login.html`; the
server-confirmed employee/staff role must route to the employee business page
`employee-v3.html`. Do not treat `employee-v3.html` as the primary login entry.
Local
wrangler config binds this Worker to `DB = homelink`, so write-style tests can
affect production data and must not be run unless production D1 writes are
separately approved. Do not include passwords, tokens, cookies, or real
production customer data in evidence.

| Test ID | Scenario                     | Steps                                                                                                                                  | Expected Result                                                                            | Evidence Needed                                               | Pass/Fail | Notes |
| ------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | --------- | ----- |
| EMP-001 | Unified login / logout       | Open `unified-login.html`, sign in as employee, confirm automatic route to the employee business page `employee-v3.html`, then logout. | Employee can login and logout through the single login entry; no owner-only pages visible. | Screenshot after login and logout with secrets masked.        |           |       |
| EMP-002 | Enter rent full payment      | Create QA rent entry for assigned property and tenant.                                                                                 | Entry is accepted or queued per staging behavior; amount is shown correctly.               | Entry screenshot and resulting history reference.             |           |       |
| EMP-003 | Enter deposit                | Create QA deposit collection for assigned property.                                                                                    | Deposit is recorded separately from rent income.                                           | Deposit entry evidence and owner history screenshot.          |           |       |
| EMP-004 | Enter arrears / owed amount  | Create QA arrears-related entry or short-pay follow-up.                                                                                | Outstanding amount remains visible and explainable.                                        | Entry screenshot and dashboard/history comparison.            |           |       |
| EMP-005 | Short pay                    | Enter rent due amount with lower paid amount.                                                                                          | Unpaid difference remains outstanding; no discount is implied.                             | Entry evidence and outstanding amount screenshot.             |           |       |
| EMP-006 | Repayment                    | Enter repayment against an existing QA outstanding amount.                                                                             | Oldest due item is reduced first if supported by staging rules.                            | Before/after outstanding evidence.                            |           |       |
| EMP-007 | Void / soft-delete           | Void a QA entry through the allowed staging flow.                                                                                      | Voided record no longer affects active totals and remains auditable.                       | Before/after screenshot and void marker.                      |           |       |
| EMP-008 | Handover submit              | Submit QA handover with rent/deposit/arrears rows.                                                                                     | Handover totals are recomputed safely and submission is accepted or clearly rejected.      | Handover summary screenshot.                                  |           |       |
| EMP-009 | Duplicate submit             | Submit the same QA form twice or refresh during submit.                                                                                | Duplicate is blocked, idempotent, or clearly reported without double counting.             | Timestamped screenshots of both attempts.                     |           |       |
| EMP-010 | Weak network retry           | Simulate slow network or retry after temporary failure.                                                                                | No duplicate financial result; user sees safe retry state.                                 | Screenshot/video if available.                                |           |       |
| EMP-011 | Wrong amount                 | Enter impossible or invalid money value.                                                                                               | Validation rejects input before save.                                                      | Validation message screenshot.                                |           |       |
| EMP-012 | Three decimals               | Enter amount with three decimal places.                                                                                                | Input is rejected or rounded only if explicitly allowed; no silent unsafe conversion.      | Validation screenshot.                                        |           |       |
| EMP-013 | Empty amount                 | Submit required money field empty.                                                                                                     | Form blocks submit and shows clear error.                                                  | Validation screenshot.                                        |           |       |
| EMP-014 | Permission denied            | Try property/tenant not assigned to employee.                                                                                          | Access is denied; no cross-property write or read occurs.                                  | Denial screenshot with property identifiers masked if needed. |           |       |
| EMP-015 | Mobile layout                | Repeat login, rent entry, and handover on phone viewport.                                                                              | Controls are usable without horizontal blocking or hidden submit buttons.                  | Mobile screenshots.                                           |           |       |
| EMP-016 | Refresh / back / reopen page | Start entry, refresh/back/reopen, then complete or cancel safely.                                                                      | No duplicate submit; state is recoverable or clearly reset.                                | Notes and screenshots.                                        |           |       |

## Stop Conditions

| Condition                                        | Required Response                         |
| ------------------------------------------------ | ----------------------------------------- |
| Money totals change unexpectedly                 | Stop finance tests and open P0/P1 bug.    |
| Employee can access another tenant/property      | Stop permission tests and open P1 bug.    |
| Duplicate submit creates duplicate financial row | Stop related flow and open P0/P1 bug.     |
| Password/token appears in UI or logs             | Stop and report security bug immediately. |

## Visual Comparison Checks

## Auth Routing Stabilization Retest

| Test ID | Scenario                         | Steps                                                       | Expected Result                                                                                                        | Evidence Needed                        | Pass/Fail | Notes |
| ------- | -------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------- | ----- |
| EMP-017 | Employee unauthenticated routing | In a clean browser state, open `employee-v3.html`.          | Page routes to `unified-login.html`; the old PIN panel does not appear or flash.                                       | Short clip or timed screenshots.       |           |       |
| EMP-018 | Employee identity display        | Sign in through unified login as an employee/staff account. | Header shows display name, username, or employee id such as `abdul`; it does not show role `staff` as the person name. | Header screenshot with secrets masked. |           |       |

Additional stop conditions:

| Condition                                                       | Required Response                                     |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| Employee page shows old PIN login after unified routing         | Stop employee auth QA and open a P1 auth-routing bug. |
| Employee visible identity is `staff` instead of account name/id | Open a P1 identity-display bug.                       |

| Check                       | Expected Result                                                      | Notes                                                 |
| --------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| Employee design baseline    | Employee page remains visually modern and unchanged in product feel. | Use as reference for owner UI comparison.             |
| Shared font                 | Employee page continues using the shared product font stack.         | Report if text rendering regresses.                   |
| Shared buttons/inputs/cards | Employee controls still look consistent after token extraction.      | Report as P1 UX if employee visual quality regresses. |

## AUTH-UI-STABILIZATION-002 Employee Checks

| Test ID      | Scenario                      | Steps                                   | Expected Result                                                                     | Evidence Needed  | Pass/Fail | Notes                 |
| ------------ | ----------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- | ---------------- | --------- | --------------------- |
| EMP-AUTH-001 | Unauthenticated employee page | Open `employee-v3.html` without session | Redirects unified login; old PIN login does not appear                              | Screenshot / URL |           | Read-only             |
| EMP-AUTH-002 | Employee identity             | Login as a test employee                | Header shows actual account / employee id, not `staff`                              | Screenshot       |           | Do not submit entries |
| EMP-AUTH-003 | Top navigation                | View `录入 / 跟进 / 导出` tabs          | All three buttons show Chinese above English consistently; English is not truncated | Screenshot       |           | No write              |

## INTERNAL-QA-BLOCKERS-003 Employee Checks

| Test ID            | Scenario                | Steps                              | Expected Result                                                                | Evidence Needed            | Pass/Fail | Notes           |
| ------------------ | ----------------------- | ---------------------------------- | ------------------------------------------------------------------------------ | -------------------------- | --------- | --------------- |
| EMP-BLOCKER-003-01 | Employee display name   | Login as Abdul/Zhang/Li test user  | Header shows only the real name, centered; no `当前员工`, no `staff` role text | Mobile screenshot          |           |                 |
| EMP-BLOCKER-003-02 | Script error regression | Open employee page after login     | No visible `Script error.` toast during initial render                         | Screenshot or console note |           | No write action |
| EMP-BLOCKER-003-03 | Top nav consistency     | Check 录入 / 跟进 / 导出 on mobile | Chinese over English, consistent sizes, no truncated `EXPO...`                 | Mobile screenshot          |           |                 |

## THREE-PORTAL-FIX-001 Employee Entry Notes

Use `/` only to choose the employee role. The main portal must show 员工, 老板, 管理员 only.

员工欠款跟进任务 remains inside the employee workspace after login. Employees should not enter arrears management from a fourth main-portal card.

Production cutover remains `PRODUCTION_NO_GO`.

## Employee Arrears Follow-Up Simplification

During employee QA, confirm:

- Employee arrears follow-up form shows promised repayment date.
- Employee arrears follow-up form shows note.
- Employee arrears follow-up form does not ask for promised amount.
- If status is `承诺付款`, promised repayment date is required.
- Note is recommended for operational context.
- Production cutover remains `PRODUCTION_NO_GO`.
## Employee Arrears Directive QA - 2026-05-31

1. Open employee follow-up page.
2. Confirm assigned directive read contract is `/api/employee/arrears/directives`.
3. Confirm task cards show room/bed, customer, amount, due date, status, promised payment date, and note.
4. Confirm employee feedback form asks for promised payment date and note.
5. Confirm no promised amount input is required or accepted.
6. Confirm employee cannot close task.
7. Confirm write path remains approval gated unless staging/production write approval is explicit.

## Boss Directive Inbox Acceptance - 2026-05-31

1. Open employee FOLLOW-UP.
2. Confirm `老板下发任务` section appears above `系统提醒`.
3. If no boss directives exist, expected text is `暂无老板下发任务`.
4. If a directive exists, card must show bed, amount, source, due/overdue, status, owner note, promised date input, and follow-up note input.
5. Employee feedback must not include amount edit, promised amount input, close, or void.
6. If production write gate is off, submit attempt must explain that feedback was not written to production.

## Live Employee Inbox Acceptance After Deploy - 2026-05-31

1. Log in as an employee.
2. Open FOLLOW-UP.
3. Confirm `老板下发任务` section appears.
4. If there are no real directives, confirm it displays `暂无老板下发任务`.
5. Confirm `系统提醒` remains visible separately.
6. Do not perform employee follow-up write unless separately approved.

## Abdul One-Task Follow-up Write Acceptance - 2026-06-01

1. Confirm Abdul can see the assigned boss directive for `144 / 139780080 / 50.00 AED`.
2. Confirm the submitted promised payment date is `2026-06-10`.
3. Confirm the submitted follow-up note is visible after refresh.
4. Confirm the form does not allow amount edit, close, void, handover, or accounting status changes.
5. Confirm the task amount remains `50 AED` and `actual_received` remains `0`.
6. Confirm any further production follow-up write requires a separate approval because the write gate is closed.
7. Production cutover remains `PRODUCTION_NO_GO`.

## Persisted Follow-up State Acceptance - 2026-06-01

1. Reload the employee FOLLOW-UP page after a saved feedback exists.
2. Confirm unchanged saved promised date and note show as saved/existing feedback.
3. Click the saved button/state without editing and confirm no production-write-disabled error appears.
4. Change promised date or note and confirm the card shows current changes unsubmitted.
5. With write gate off, submit the dirty edit and confirm the warning says the current modification will not write to production.
6. Confirm amount edit, close, void, handover, and promised amount remain unavailable.
7. Production cutover remains `PRODUCTION_NO_GO`.

## Live Persisted State UI Fix Acceptance - 2026-06-01

1. Confirm `/employee-v3` contains `serverOriginalPromisedDate`, `serverOriginalFollowupNote`, `updateEmployeeDirectivePersistedState`, and `employeeDirectiveIsDirty`.
2. Log in as Abdul and open FOLLOW-UP.
3. For an already saved feedback task, confirm unchanged server date/note shows saved/existing feedback.
4. Click the saved state without editing and confirm no write-gate-off warning appears.
5. Change promised date or note and confirm the card shows current changes unsubmitted.
6. With write gate off, submit the dirty edit and confirm the warning says the current modification will not write to production.
7. Confirm promised amount input, amount edit, close, void, handover, and accounting status changes remain unavailable.
8. Production cutover remains `PRODUCTION_NO_GO`.

## Employee Follow-up Simplified Bilingual UI Acceptance - 2026-06-01

1. Confirm header shows one employee identity display only.
2. Confirm visible button says `Logout / 退出`.
3. Open FOLLOW-UP and confirm module labels are English-first bilingual.
4. Confirm boss assigned task cards default to compact view: bed, amount, due date, status, expand action.
5. Confirm default card does not show customer_code such as `139780080`.
6. Tap `Expand Details / 展开详情` and confirm date/note inputs appear.
7. Tap `Collapse Details / 收起详情` and confirm details are hidden again.
8. Confirm no promised amount input, amount edit, close, void, handover, or accounting status edit exists.
9. Confirm no production write is performed during this acceptance.
10. Production cutover remains `PRODUCTION_NO_GO`.

## Live Persisted State Deployment Check - 2026-06-01

1. Before repeating phone acceptance, confirm the live asset contains `serverOriginalPromisedDate` and `updateEmployeeDirectivePersistedState`.
2. If those markers are missing, treat the issue as `LIVE_NOT_DEPLOYED`.
3. Do not submit another employee follow-up to validate this UI state.
4. Do not open write gate for UI acceptance.
5. Production cutover remains `PRODUCTION_NO_GO`.
## EMPLOYEE-FOLLOWUP-MATCH-ENTRY-UX-001

Status: ready for internal mobile acceptance, not deployed by default.

- Follow-up page must visually match the Entry page layout system.
- Employee app now exposes only `Entry / 录入` and `Follow-up / 跟进`.
- Employee Export tab/page is removed; Entry handover internals remain hidden and preserved.
- Header employee name and `Logout / 退出` use the same size, color, font, and centered layout.
- Follow-up task cards default to a compact execution view and support expand/collapse.
- No production write, no migration, write gate off.
- Production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-MATCH-ENTRY-UX-DEPLOY-001

Live Worker version: `bae1241e-ac4b-4747-bebe-a4bb4a9bd00f`.

Employee authenticated phone acceptance should verify:

1. Open the employee app through the root three-door entry.
2. Confirm only `Entry / 录入` and `Follow-up / 跟进` are visible in the employee tab bar.
3. Confirm no visible employee Export tab or Export page is available.
4. Confirm the header shows one employee identity area and a clear `Logout / 退出` control.
5. Open Follow-up and confirm task cards visually match Entry page cards and controls.
6. Confirm boss-assigned task details are behind Details / Collapse.
7. Confirm raw `customer_code` and `existing_arrears_record` are not shown in the default card.
8. Confirm no production write is performed during visual acceptance.
9. Confirm production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-FULL-UX-PARITY-WITH-ENTRY-001

Status: implemented locally, not deployed by default.

Employee acceptance checks:

1. Treat Entry as the only employee visual and interaction source of truth.
2. Confirm the header has one employee identity control and one matching `Logout / 退出` control.
3. Confirm only Entry and Follow-up tabs are visible; Export remains hidden.
4. Confirm Follow-up section uses the same card, head, body, step, KPI, button, and form control system as Entry.
5. Confirm Boss Assigned Tasks default to collapsed essentials: bed, amount, due date, status, and Details.
6. Confirm `customer_code`, internal ids, and raw technical source labels are not shown in the default task card.
7. Confirm System Reminders use Entry-style `step-title`, `kpi-grid`, `kpi-card`, and `step` cards.
8. Confirm no production write is performed and write gate remains off.
9. Confirm production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-ENTRY-HARD-PARITY-DEPLOY-001 Mobile Checks

Live Worker version: `5d949970-115e-4208-8a39-dac981c4bf61`.

Employee phone acceptance after the UI-only deploy:

1. Open the employee page and confirm the header remains compact.
2. Confirm only Entry and Follow-up tabs are visible; Export must not appear.
3. Confirm Entry / Follow-up tabs are centered and do not wrap.
4. Open Follow-up and confirm the page body uses the Entry-style card rhythm.
5. Confirm Boss Assigned Tasks use compact cards and do not show default customer codes.
6. Confirm System Reminders use Entry-style KPI/cards and are collapsed by default.
7. Tap Details / Collapse and confirm the card expands and collapses without page jump.
8. Confirm no write is triggered by viewing or expanding cards.
9. Confirm write gate remains off and production cutover remains `PRODUCTION_NO_GO`.

## EMPLOYEE-FOLLOWUP-BOSS-CARD-COMPACT-UI-001 Employee Checks

Date: 2026-06-01, Asia/Dubai

Boss Assigned Tasks compact-card acceptance:

1. Confirm the default card shows only bed, amount, due date, overdue/not-overdue state, and saved/unsaved state.
2. Confirm helper text such as `Only update promise date and note` is not visible.
3. Confirm source and boss-note blocks are not visible in the employee task card.
4. Confirm Details opens a short form with only Promise Date, Note, and Save.
5. Confirm the Note field is blank when there is no saved note.
6. Confirm a real saved note still appears if the server has saved feedback.
7. Confirm known QA/demo smoke note text is not prefilled.
8. Confirm `Saved / 已保存` is shown only for saved unchanged feedback.
9. Confirm unsaved/edited feedback uses `Save / 保存`.
10. Confirm no production write is performed and write gate remains off.

## EMPLOYEE-FOLLOWUP-BOSS-CARD-COMPACT-DEPLOY-001 Mobile Checks

Live Worker version: `1ef96378-7259-4605-ac46-7e5dfe169488`.

Employee phone acceptance after deploy:

1. Open Abdul employee page.
2. Open Follow-up.
3. Confirm Boss Assigned task `144 / 50 AED` remains visible.
4. Tap `Expand Details / 展开详情`.
5. Confirm expanded state is compact and does not take almost a full screen.
6. Confirm helper instruction box is gone.
7. Confirm source / existing arrears box is gone.
8. Confirm boss-note box is gone.
9. Confirm expanded area only has Promise Date, Note, Save, and Collapse.
10. Confirm Note is blank unless there is a real saved non-QA note.
11. Confirm blank Note does not create dirty state.
12. Confirm changing date or note shows Unsaved / 当前修改未提交.
13. Confirm no promised amount input appears and amount cannot be edited.
14. Confirm no production write is triggered during visual QA.

## Directive Inbox Count Regression Check

1. Open Employee Follow-up as Abdul.
2. Confirm Boss Assigned count equals the real persisted assigned directives returned by `/api/employee/arrears/directives`.
3. Confirm owner-side dry-run selected count is not shown in the employee inbox.
4. If only one persisted Abdul directive exists, the employee page must show `1 ASSIGNED`.
5. If no persisted directive exists, it must show `No boss assigned tasks / 暂无老板下发任务`.
6. Do not use fake rows or owner dry-run rows to inflate employee count.
7. No production write is authorized during this check.

## Mixed Source Dispatch Blocked Preflight Employee Check

Production full dispatch to Abdul is blocked until Ramadan confirms whether the actual current SOT count 46 should be dispatched.

When approval is later granted, employee QA must verify:

1. Abdul sees persisted assigned directives only.
2. Existing arrears and TTLock materialized rows both appear.
3. The employee inbox count matches the actual created plus already-assigned directives.
4. No owner dry-run rows appear in Abdul's inbox.
5. Internal source refs, raw source types, and debug fields are not shown.
6. No employee follow-up batch write is included in the dispatch validation.
7. Production cutover remains `PRODUCTION_NO_GO`.

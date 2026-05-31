# Employee Internal Test Script

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

## Live Persisted State Deployment Check - 2026-06-01

1. Before repeating phone acceptance, confirm the live asset contains `serverOriginalPromisedDate` and `updateEmployeeDirectivePersistedState`.
2. If those markers are missing, treat the issue as `LIVE_NOT_DEPLOYED`.
3. Do not submit another employee follow-up to validate this UI state.
4. Do not open write gate for UI acceptance.
5. Production cutover remains `PRODUCTION_NO_GO`.

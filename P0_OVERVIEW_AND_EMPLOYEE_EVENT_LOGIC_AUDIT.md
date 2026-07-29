# P0 Overview And Employee Event Logic Audit

Read-only audit. No code changes, no deployment, no production writes, no migration.

## Scope

- Owner Overview four cards:
  - Outstanding Collection / 待收尾款
  - Today Actions / 今日待办
  - Current Period Received / 当前账期实收
  - Cloud Arrears Collection / 欠款代收
- Employee Entry event logic:
  - Arrears Payment / 还欠款
  - Deposit Out / 退押金
  - Checkout / 退房

## Overview Card SOT Audit

| Card | Current API | Current Function | Current SOT | Current Result | Correct SOT | Correct Result |
|---|---|---|---|---:|---|---:|
| Outstanding Collection / 待收尾款 | `GET /api/owner/overview/comparative-summary` | Backend: `phase0OwnerOverviewComparativeSummary()`; Frontend: `renderOwnerOverview()` | Frontend uses `current_receivables_sot.summary` when present, but falls back to `arrears.outstanding_amount` / local `openArrears`. Quick preview uses `ownerArrearsActiveRows()` | User-visible 350 | Current receivables SOT from `resolveConsoleReceivablesSot()` / `resolveCurrentReceivablesSot()` only. Must not use cloud arrears | Must equal current overdue / due receivable amount from current receivables SOT |
| Today Actions / 今日待办 | `GET /api/owner/overview/comparative-summary` | Backend: `phase0OwnerOverviewComparativeSummary()`; Frontend: `renderOwnerOverview()` and `ownerOverviewShowTodayActionsPreview()` | Top card uses `current_receivables_sot.summary.action_count` when present; fallback uses `risk_watch` / local arrears. Quick preview uses `ownerArrearsActiveRows()` | User-visible overdue 0 / today 0 / due soon 0 | Current receivables SOT: `overdue_count`, `due_today_count`, `due_soon_count`, `action_count` | Must match owner console current receivables buckets |
| Current Period Received / 当前账期实收 | `GET /api/owner/overview/comparative-summary` | `ownerOverviewFetchSessionPeriodSummary()` exposed as `current_period_received`; frontend reads `ownerOverviewCurrentPeriodReceived()` | Owner-visible `sessions` summary, filtered by billing period 3rd to 2nd, non-void | User-visible 6,140. Read-only D1 snapshot now shows 6,840 after later uploads | Same path. Keep this unchanged | Same as current owner-visible sessions total for 2026-07-03 to 2026-08-02 |
| Cloud Arrears Collection / 欠款代收 | `GET /api/owner/overview/comparative-summary` | `ownerOverviewArrearsSummary()` + frontend `ownerOverviewCloudArrearsCollection()` | Cloud arrears rows only: historical open / partial arrears details | User-visible 350 | Cloud arrears / `arrear_tasks` open or partial historical arrears only | 350 in current observed UI |

### Current Period Sessions Snapshot

Readonly D1 SELECT against `sessions`, filtered by `corpid='homelink'`, date `2026-07-03` to `2026-08-02`, non-void, `handover_status != VOID`.

| date | session id | anchor | source | cash | bank | gross | included_reason |
|---|---|---|---|---:|---:|---:|---|
| 2026-07-05 | S20260705-4q7zk | EMPV3-20260705-abdul-4q7zk | employee_entry | 3,710 | 1,460 | 5,370 | Current billing period, owner-visible, non-void |
| 2026-07-06 | S20260706-vfx2y | EMPV3-20260706-abdul-vfx2y | employee_entry | 700 | 0 | 700 | Current billing period, owner-visible, non-void |
| 2026-07-06 | S20260706-zl7tz | EMPV3-20260706-abdul-zl7tz | employee_entry | 70 | 0 | 70 | Current billing period, owner-visible, non-void |
| 2026-07-06 | S20260706-7z9rt | EMPV3-20260706-abdul-7z9rt | employee_entry | 700 | 0 | 700 | Current billing period, owner-visible, non-void |

Current readonly snapshot total: 6,840. This differs from the user-reported 6,140 because production sessions changed after the screenshot. The code path for Current Period Received is still the correct owner-visible sessions path and should not be replaced with transactions / entry_events.

### Wrongly Included Rows

No wrongly included current-period session rows were found in the readonly sessions query. The known risk is not the Current Period Received path; the risk is Outstanding / Today Actions falling back to cloud arrears or local owner arrears rows instead of strictly using current receivables SOT.

| date | session id | anchor | source | amount | why_wrong |
|---|---|---|---|---:|---|
| N/A | N/A | N/A | N/A | 0 | No invalid sessions found for current-period received in the readonly snapshot |

### Overview Root Cause

Primary root cause:

- `OUTSTANDING_USES_CLOUD_ARREARS`

Secondary root cause:

- `TODAY_ACTIONS_USES_WRONG_SOT`

Details:

- `Current Period Received` is currently wired to `sessions` summary and should be preserved.
- `Cloud Arrears Collection` is correctly separated as historical cloud arrears.
- `Outstanding Collection` must represent current rent receivables / overdue receivables, but the frontend has fallback paths to `arrears.outstanding_amount` and local `openArrears`, which can collapse it into cloud arrears.
- `Today Actions` must be driven by current receivables SOT buckets. Its quick preview currently uses `ownerArrearsActiveRows()`, which is not the same as the current receivables SOT.

## Employee Arrears Payment Audit

### API And Data Path

| Item | Path |
|---|---|
| Employee UI loader | `employee-v3.html` `loadTasks()` |
| Employee API route | `GET /api/arrear_tasks` |
| Backend handler | `handleArrearTasks()` |
| Backend resolver | `empListMergedArrearTasks()` / `empListMergedArrearTasksDetailed()` |
| Primary source table | `arrear_tasks` |
| Employee bed filter | `openTasksForBed()` filters by `bed` or `tenant_card_id` |
| Open-status filter | excludes `PAID`, `CLEARED`, `CLOSED`, `VOID`, `WRITTEN_OFF`, `WAIVED`, Chinese settled/void statuses, and requires remaining amount > 0 |

### Bed 144 Cloud Arrears Readonly Snapshot

| bed | arrears_ref | status | remaining | source table | owner visible | employee visible | mismatch reason |
|---|---|---|---:|---|---|---|---|
| 144 | task-mr8vfyi6-ce3d4daa | PAID / 已结清 | 0 | arrear_tasks | Not visible as open cloud arrears | Not visible as open cloud arrears | The row is settled, so employee open-arrears filtering correctly excludes it |
| 144 | task-mr5bepkg-e7425634 | VOID / 作废 | 0 | arrear_tasks | Not visible as open cloud arrears | Not visible as open cloud arrears | Voided row, correctly excluded |
| 144 | task-mpgzu9kp-f150e26f | VOID / 作废 | 50 | arrear_tasks | Not visible as open cloud arrears | Not visible as open cloud arrears | Voided row, correctly excluded even though amount remains |

### Employee Arrears Root Cause

Root cause classification:

- `ARREARS_ALREADY_SETTLED_OR_VOID`

Details:

- The employee route does read cloud arrears from `arrear_tasks`.
- The bed 144 row named by the user is no longer open in production; it is `PAID / 已结清`.
- Therefore the employee UI showing no selectable open arrears for bed 144 is consistent with current production data.
- If a new open arrears item is expected for testing, it must be created through a valid short-paid / cloud-arrears flow, not by reusing this settled reference.

## Deposit Out Audit

| Check | Result |
|---|---|
| Current renderer | Shared employee entry form in `employee-v3.html` |
| Dedicated Deposit Out fields | Partial. Uses amount/payment/note and deposit balance logic, but does not provide a clean event-specific form |
| Rent-only fields shown or retained | `listPrice` can remain visible/stale because only Arrears Payment explicitly hides it; generic amount area still contains rent-oriented labels |
| Rent period shown | `periodStep` is hidden for Deposit Out by `hasPeriod=['R','TFF']` |
| Cloud Arrears check | Connected through `openTasksForBed()` validation override; open arrears blocks direct Deposit Out |
| Deposit balance check | Connected in backend `handleEmployeeEntry()` through `empDepositBalance()` and deposit amount validation |
| Anchor risk | UI can confuse operator and generic summary can show rent-style fields; backend has some deposit protections |

Deposit Out root cause classification:

- `DEPOSIT_OUT_REUSES_RENT_FORM`

Secondary issue:

- `EVENT_SPECIFIC_FIELDS_MISSING`

## Checkout Audit

| Check | Result |
|---|---|
| Current renderer | Shared employee entry form in `employee-v3.html` |
| Dedicated Checkout fields | Partial. `checkoutFields` exist, including left-with-arrears fields, checkout date, deposit deductions, belongings/promise/contact fields |
| Rent-only fields shown or retained | Generic amount/list-price/review sections can still carry rent-oriented fields or stale values |
| Rent period shown | `periodStep` is hidden for Checkout by `hasPeriod=['R','TFF']` |
| Cloud Arrears block | Connected through validation override; open arrears blocks normal Checkout unless Left With Arrears mode is selected |
| Deposit balance check | Connected in backend for checkout deposit deduction |
| Anchor risk | The flow is partially correct but not event-specific enough; the generic rent-style amount/review UI causes wrong mental model |

Checkout root cause classification:

- `CHECKOUT_REUSES_RENT_FORM`

Secondary issue:

- `EVENT_SPECIFIC_FIELDS_MISSING`

## Recommended Smallest Fix Order

1. Overview card SOT mapping:
   - Make Outstanding Collection strictly read `current_receivables_sot.summary.outstanding_amount_fils` and current receivables rows.
   - Make Today Actions strictly read `current_receivables_sot.summary.overdue_count`, `due_today_count`, `due_soon_count`, and `action_count`.
   - Keep Cloud Arrears Collection strictly on cloud arrears open/partial rows.
   - Keep Current Period Received on owner-visible sessions summary.

2. Employee Arrears Payment cloud lookup:
   - No route mismatch was found for bed 144; the named arrears row is settled.
   - Add a clearer employee UI state when a previously expected arrears ref is closed/void, or test with a new open cloud-arrears row.

3. Deposit Out event-specific form:
   - Hide `listPrice`, rent due, system paid/clear, and rent-period fields for Deposit Out.
   - Show only Bed, Deposit Balance, Refund Amount, Refund Method, Refund Date, Refund Reason, Note, and Open Arrears Check.

4. Checkout event-specific form plus arrears block:
   - Hide `listPrice`, rent due, system paid/clear, and rent-period fields for Checkout.
   - Show Checkout Date, Deposit Balance, Deposit Refund Amount, Outstanding Arrears, Checkout Type, Left With Arrears fields, and Owner Approval status.

5. Left With Arrears extension:
   - Keep as extension after the event-specific Checkout form is cleaned up.
   - Preserve existing left-with-arrears anchor fields and cloud-arrears linkage.

## Safety Confirmation

| Item | Result |
|---|---|
| Production write | no |
| Migration | no |
| Deploy | no |
| Parser change | no |
| Financial formula change | no |
| ENTRY_ANCHOR_CONTRACT change | no |
| Production cutover | PRODUCTION_NO_GO |

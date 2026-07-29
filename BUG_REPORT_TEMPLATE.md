# Bug Report Template

## TTLOCK-ARREARS-SOURCE-FIX-001 Severity Notes

Treat these as arrears source regressions:

- TTLock expired unpaid cards are absent while live TTLock expired card data and rent mapping exist.
- TTLock unavailable is shown as if the source succeeded.
- TTLock failure hides existing system arrears.
- TTLock rows use an unknown amount instead of mapped bed rent.
- Missing rent rows are silently dropped without config-missing evidence.

Never include passwords, tokens, cookies, TTLock access tokens, client secrets, or unmasked sensitive screenshots.

## ARREARS-ROOT-CAUSE-LOCK-001 Severity Notes

Treat these as P0/P1 arrears regressions: owner arrears pool missing TTLock expired cards, current due unpaid rows hidden, unknown-amount TTLock rows hidden instead of showing `金额待核对`, owner arrears main list showing raw debug labels, owner arrears main list showing direct write shortcuts, or `网络` wrapping to a second nav row.

## AUTH-ROUTING-ARCHITECTURE-001 Auth Routing Severity Notes

Treat these as P0/P1 auth-routing bugs: old employee PIN login visible, old owner login visible, lock/logout not returning to `/`, stale role causing wrong business page, readonly admin seeing write controls as enabled, or employee name showing role `staff`. Production cutover remains `PRODUCTION_NO_GO`.

Use this template for internal staging QA bugs. Do not include passwords,
tokens, cookies, or unmasked sensitive screenshots.

| Field                 | Value                          |
| --------------------- | ------------------------------ |
| Bug ID                |                                |
| Reporter              |                                |
| Date / Time           |                                |
| Environment           | staging                        |
| Role                  | employee / owner / manager     |
| Device                |                                |
| Browser               |                                |
| Steps to Reproduce    |                                |
| Expected Result       |                                |
| Actual Result         |                                |
| Screenshot / Evidence |                                |
| Severity              | P0 / P1 / P2 / P3              |
| Financial Impact      | yes/no                         |
| Data Impact           | yes/no                         |
| Permission Impact     | yes/no                         |
| Suggested Owner       |                                |
| Status                | open / fixed / retest / closed |

## Severity Guide

| Severity | Meaning                                                                | Required Response                                        |
| -------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| P0       | Direct financial corruption, data loss, or unsafe duplicate write      | Stop affected QA flow and escalate immediately.          |
| P1       | Permission leak, cross-tenant data exposure, or major blocked workflow | Stop affected scope and require fix/retest before pilot. |
| P2       | Important functional bug with workaround                               | Track and decide whether pilot can continue.             |
| P3       | Usability, copy, layout, or minor display issue                        | Track for cleanup; does not block internal QA by itself. |

## Design-System UX Bug Notes

| Scenario                                            | Suggested Severity | Expected Result                                                                                                    |
| --------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Owner UI still visibly looks older than employee UI | P1                 | Owner and employee should feel like one SaaS product with same typography, cards, buttons, inputs, and background. |
| Owner second login panel flashes before auth check  | P1                 | Owner should show auth loading first, then dashboard or fallback login after `/api/me`.                            |
| Owner mobile layout blocks dashboard/history review | P1                 | Mobile owner dashboard must remain usable and readable.                                                            |
| Owner mobile layout is awkward but usable           | P2                 | Record screenshots and affected viewport.                                                                          |
| Shared token styling regresses employee page        | P1                 | Employee page should remain the visual baseline.                                                                   |

## Unified Login UX Bug Notes

Use these expected results when reporting unified-login bugs:

| Scenario                                      | Expected Result                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Owner login after unified-login route         | Owner destination shows `Checking session` first, then dashboard; no legacy password flash. |
| Browser back to unified-login while signed in | Page shows signed-in panel with Continue and Clear session choices; no automatic loop.      |
| Employee login after unified-login route      | Employee destination should not ask for a second PIN if `/api/me` confirms employee/staff.  |
| Any successful live login smoke               | Requires separate approval because it can write production D1 `active_sessions`.            |

## Owner UX Stabilization Bug Notes

| Scenario                                        | Suggested Severity | Expected Result                                                                                                          |
| ----------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Login remembers password / PIN                  | P0                 | App may remember only username / account. Password storage by app code is forbidden.                                     |
| Owner topbar still shows `老板` badge           | P2                 | Badge should be removed; server session remains the authority.                                                           |
| Owner overview gives no business decision value | P1/P2              | Overview should show today's receipts, outstanding amount, pending items, handover/alerts, recent flow, and quick links. |
| Owner history has 15-20 second blank load       | P1                 | History should show loading skeleton quickly and load recent rows first.                                                 |
| Owner mobile typography/cards are too large     | P1/P2              | Mobile owner pages should increase useful information density while remaining readable.                                  |

## Auth Routing Stabilization Bug Notes

| Scenario                                                     | Suggested Severity | Expected Result                                                                                                         |
| ------------------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Any old login panel appears after opening a role destination | P1                 | Unauthenticated `index.html` and `employee-v3.html` should redirect to `unified-login.html` without legacy login flash. |
| Lock/logout opens an old login page                          | P1                 | Lock/logout should clear session state and route to `unified-login.html`.                                               |
| Employee header displays `staff` as the person name          | P1                 | UI should show display name, username, or employee id; `staff` is only a role.                                          |
| Owner history shows no feedback for more than 5 seconds      | P1                 | History should show skeleton/loading quickly and load recent records first.                                             |
| Owner network/WiFi entry is missing                          | P2/P1              | Entry should be visible or documented as manual-required; severity depends on operational impact.                       |

## AUTH-UI-STABILIZATION-002 Bug Classification Addendum

| Condition                                                    | Severity |
| ------------------------------------------------------------ | -------- |
| Old employee PIN login is visible to a user                  | P0/P1    |
| Old owner login is visible to a user                         | P0/P1    |
| Lock/logout routes anywhere except unified login             | P1       |
| Employee identity displays `staff` instead of actual account | P1       |
| Owner history shows no feedback for more than 5 seconds      | P1       |
| Owner control panel mobile layout breaks                     | P1/P2    |
| Arrears detail modal is unreadable on mobile                 | P1/P2    |
| Employee top tab labels are inconsistent or truncated        | P2       |

## INTERNAL-QA-BLOCKERS-003 Severity Guidance

- Visible employee `Script error.` during initial render: P1.
- Employee name shown as `staff` or with wrong label: P1.
- Arrears export unreadable, contains ASCII box art, or empty `update:` fields: P1/P2 depending on launch impact.
- Arrears modal shows only one record per mobile screen: P2, P1 if it blocks collection follow-up.
- App stores plaintext password/PIN in frontend storage: P0 security bug.
- Readonly admin can perform any business write: P0 authorization bug.

## Owner Arrears Final UX Regression Rules

Treat these as P1 blockers:

- Owner arrears page stays blank or unusable for around 20 seconds.
- Owner arrears page shows a third source beyond system existing arrears and TTLock expired unpaid.
- TTLock expired unpaid card shows `金额待核对` instead of a rent-mapped amount.
- Missing bed rent configuration appears as a normal owner arrears card.
- Owner arrears card does not match the history page card visual system.
- Owner arrears card shows raw/debug labels such as `directive`, `promise`, `staff`, `source_type`, `followup_status`, `none`, `undefined`, or `null`.
- Top navigation still says `欠款管理` or wraps to a second line on mobile.

Production remains `PRODUCTION_NO_GO`.

## Arrears Follow-Up Regression Fields

- Does owner card show `承诺金额` by default? Expected: no.
- Does owner card still show top arrears amount? Expected: yes.
- Does employee follow-up ask for promised amount? Expected: no.
- Does employee follow-up keep promised repayment date and note? Expected: yes.
- Screenshot URL/page:
- Account role:
- Device/browser:
- Production cutover remains `PRODUCTION_NO_GO`.

## Owner Module Regression Rules

Treat these as blockers:

- Missing `分析` entry: regression blocker.
- Owner arrears shows `signal is aborted without reason`: P1 blocker.
- Any owner module is unreachable after login: regression blocker.
- Owner shell changes deployed without `npm run test:owner-regression-smoke`: QA process blocker.

Production remains `PRODUCTION_NO_GO`.

## Owner Arrears Overview Loading Rules

Treat these as blockers:

- `欠款` appears as a top-level owner tab after the merge.
- Overview is missing the `欠款跟进` module.
- Arrears loading lasts longer than 20 seconds: P1.
- Arrears loading lasts 3 minutes: P0/P1.
- Arrears API failure breaks overview KPIs, sessions, alerts, or ledger.
- Timeout does not show retry.

Required evidence:

- `npm run test:owner-arrears-infinite-loading`
- `npm run test:owner-overview-arrears-timeout`

Production remains `PRODUCTION_NO_GO`.

## Owner Arrears / Navigation Regression Fields

- 是否出现欠款模块无限 loading：是 / 否
- 是否超过 10 秒仍无成功、空、部分失败、错误重试状态：是 / 否
- 是否只有“读取超时”但没有可恢复闭环：是 / 否
- 是否系统已有欠款和通通锁来源互相影响：是 / 否
- 顶部导航是否可横向滑动：是 / 否
- 欠款是否错误恢复为一级 Tab：是 / 否
- 分析入口是否丢失：是 / 否
- Production cutover remains `PRODUCTION_NO_GO`.

# Mobile QA Checklist

Generated: 2026-05-29
Scope: real-device checklist. No write QA is authorized by this document.

## Global Rules

- Official entry is `/`.
- Old login pages must not appear.
- Production cutover remains `PRODUCTION_NO_GO`.
- Full write QA requires separate approval.
- Do not print passwords, tokens, or cookies.

## Employee Portal

| Check | Expected |
|---|---|
| Login through employee door | Enters employee page |
| Employee name display | Real name only, not `staff` |
| Top buttons | Chinese top, English bottom, no truncation |
| Initial render | No Script error toast |
| Entry UI | Visible but do not submit real write without approval |
| Logout/lock | Returns to `/` |

## Owner Portal

| Check | Expected |
|---|---|
| Login through owner door | Enters owner page |
| Dashboard/control panel | No mobile overflow |
| History | Skeleton quickly, recent rows first, load more |
| Arrears modal | Compact list, multiple rows visible |
| WhatsApp export | Bed-grouped format with fire marker only when overdueDays > 1 |
| Network/WiFi entry | Visible or documented as manual-required |
| Logout/lock | Returns to `/` |

## Readonly Admin Portal

| Check | Expected |
|---|---|
| Login through admin door | Enters admin/owner readonly view |
| `/api/me` | role readonly_admin, canWrite false |
| Read dashboard/history/customers | Allowed |
| Write buttons | Hidden or disabled |
| Direct write API | 403 |
| Logout/lock | Returns to `/` |

## Performance Observations

| Scenario | Target |
|---|---:|
| History skeleton | under 300 ms |
| First history data | under 1 s on normal mobile network |
| Arrears modal | under 500 ms |
| Logout redirect | immediate |

## Stop Conditions

- Old employee PIN login appears.
- Old owner login appears.
- Any readonly admin write succeeds.
- Employee name shows role instead of real name.
- History stays blank for 30 seconds.
- Money totals mismatch backend values.

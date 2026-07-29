# Unified Login Back Button Behavior Fix

Date: 2026-05-28, Asia/Dubai

## Change Summary

| Area                              | Change                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| Existing session on unified login | Shows a signed-in panel instead of immediately redirecting.                                     |
| Continue action                   | Routes owner/manager/admin to `index.html`; routes employee/staff to `employee-v3.html`.        |
| Clear session action              | Calls `/auth/logout`, clears local/session token fallback storage, and stays on the login form. |
| Explicit auto redirect            | Still supported only with `?auto=1`.                                                            |
| Browser back behavior             | Back to `unified-login.html` should show the signed-in panel, not an automatic redirect loop.   |

## Safety Boundary

This fix changes only login/session UX routing. It does not approve production D1
write, production migration, production deploy, feature flags, dashboard
authority switch, or commercial launch GO.

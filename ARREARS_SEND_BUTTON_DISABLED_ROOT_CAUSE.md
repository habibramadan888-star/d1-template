# Arrears Send Button Disabled Root Cause

Generated: 2026-05-31

## Summary

The owner arrears card checkbox state was visually changing, but the send button could remain disabled because arrears controls can be rendered in more than one owner panel. The previous state sync updated only `document.getElementById('arrearDirectiveBtn')`, so duplicate rendered controls could leave the visible button stale.

Root cause category: `SELECTED_STATE_NOT_UPDATED` and `BUTTON_DISABLED_OLD_CONDITION`.

| Check | Result | Root Cause | Required Fix |
|---|---|---|---|
| Select-all updates checkbox state | Pass | `toggleArrearSelectAll` marks visible checkboxes checked | Keep checkbox state as source of truth |
| Selected count matches checked boxes | Fixed | Previous sync targeted one counter by id | Update all rendered selection counters |
| Visual checked state only | Fixed | Checkbox state is now read from `[data-arrear-select]:checked` | Keep checked state, not CSS class, as source |
| Button disabled condition | Fixed | Previous logic updated one id and could miss visible duplicate button | Fan out updates through `ownerArrearsDirectiveButtons()` |
| Requested date dependency | Fixed | Final dry-run path does not require `arrearDirectiveDue` | Do not include date in disabled logic |
| Dry-run disabled by mistake | Fixed | Send button now enables when checked count > 0 | Keep dry-run clickable for owner/manager |
| Role gating | Pass | `isOwnerWriteRole()` still gates write-like controls | `readonly_admin` remains read-only |
| Employee target required | Not required for dry-run | No real delivery target is written in this task | Generate dry-run list from selected rows |
| Handler present | Pass | `sendArrearDirectives()` exists and is exported in inline action allowlist | Keep handler wired |
| Employee delivery API | Approval required | Real directive delivery is not executed in this task | Separate approval required for D1-backed delivery |

## Safety

- D1 write: No
- Migration: No
- Business write: No
- Production cutover: `PRODUCTION_NO_GO`


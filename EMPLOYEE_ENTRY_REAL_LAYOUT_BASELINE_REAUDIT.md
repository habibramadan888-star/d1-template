# Employee Entry Real Layout Baseline Reaudit

Task: EMPLOYEE-FOLLOWUP-ENTRY-LAYOUT-PARITY-HARD-FIX-001

Date: 2026-06-01, Asia/Dubai

Conclusion: FOLLOWUP_STILL_NOT_MATCHING_ENTRY before this hard fix. The implementation now adds a final parity layer and restructures reminder cards to use the Entry layout system.

| Element | Entry Real Baseline | Current Follow-up Before Fix | Gap |
|---|---|---|---|
| Header height | Compact sticky brand bar, content does not expand header | Account/logout buttons visually too large | Header controls needed compact fixed sizing |
| Logo area | Left-aligned brand, compact on mobile | Usable | No change required |
| Abdul/account button | Small pill/control proportional to header | Too large relative to mobile header | Shrink and align with logout |
| Logout button | Same control scale as account button | Too large and visually dominant | Same width/height/radius/font system |
| Entry/Follow-up nav position | Centered two-tab switcher | Looked left-biased and not balanced | Add centered `.employee-tabs` parity layer |
| Nav button width | Equal width | Inconsistent because base `.tabs` scroll style remained | Force equal width on desktop and equal grid on mobile |
| Nav button height | Compact, consistent with page rhythm | Too tall on mobile | Reduce height |
| Main container width | Shared `.wrap` max width | Follow-up used same shell but mixed internal card systems | Keep shell and rebuild internals |
| Section title | `.head` + `.title` hierarchy | Mixed boss title/reminder title styles | Use `.step-title` and Entry-style heading |
| Step/card style | `.step`, `.card`, `.kpi-card` | Reminder cards retained old red-line visual language | Remove active red-line style and use Entry cards |
| Form card style | Inputs/select/buttons from Entry form primitives | Reminder follow-up form was visible by default and dense | Move form into collapsed details |
| Input style | Rounded 16px, 48px height, shared focus | Some Follow-up controls had separate sizing | Force shared form dimensions |
| Select style | Same as input | Same issue | Force shared form dimensions |
| Primary/secondary button | `.btn` / `.mini-btn` rounded token | Inconsistent size and row layout | Align sizes and row placement |
| Card shadow/radius | Shared glass card radius/shadow | Multiple Follow-up-specific variants | Final parity override |
| Card vertical spacing | Stable 14-18px rhythm | Mixed gaps | Grid gap normalized |
| First-screen density | Compact enough to see content after header | Header/nav/reminder forms consumed too much space | Compact header/nav and collapse reminder details |

Safety: no production write, no D1 command, no migration, no write gate, no deploy.

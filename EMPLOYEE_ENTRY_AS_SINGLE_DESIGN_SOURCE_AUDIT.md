# Employee Entry As Single Design Source Audit

Task: `EMPLOYEE-FOLLOWUP-FULL-UX-PARITY-WITH-ENTRY-001`

Scope: local UI audit only. No production write, no write gate, no D1 command, no migration, no deploy.

Conclusion: `ENTRY_IS_THE_ONLY_VISUAL_AND_INTERACTION_SOURCE_OF_TRUTH`

| Design Area | Entry Current Pattern | Must Reuse In Follow-up |
|---|---|---|
| Header layout | `.top > .brand`, logo left, actions right | Use same top container and action alignment. |
| Logo area | `.logo`, `.badge`, `.word` | No separate Follow-up logo/header system. |
| Account button style | Rounded glass buttons in `.actions` | Employee identity and Logout use one shared button system. |
| Logout button style | Same rounded action control weight | Logout matches identity card dimensions and typography. |
| Top tabs | `.tabs` with two `.tab` controls, active gradient | Follow-up uses same Entry/Follow-up tab system. |
| Main container | `.wrap` max-width, spacing, mobile padding | Follow-up remains inside `.wrap` with no independent shell. |
| Card shell | `.card`, `.head`, `.body` | Follow-up section uses `card employee-panel-card`, `head`, `body`. |
| Section title | `.title` plus `.small` bilingual subtitle | Follow-up module header uses same pattern. |
| Step title | `.step-title` with numbered circular marker | Boss tasks and System Reminders use `step-title`. |
| Task/card block | `.step` card spacing and radius | Boss assigned and reminder rows use `step` card primitive. |
| KPI cards | `.kpi-grid` and `.kpi-card` | System reminder counters use `kpi-grid` and `kpi-card`. |
| Form controls | Global `input`, `select`, `textarea` styles | Follow-up date/note/status controls use same styles. |
| Primary/secondary buttons | `.btn`, `.btn.primary`, `.mini-btn` | Follow-up refresh, submit, expand/collapse reuse these controls. |
| Spacing/type scale | Shared `head`, `body`, `title`, `.small` scale | No independent Follow-up spacing scale. |
| Status tags | Compact pill labels | Follow-up tags remain short and execution-oriented. |
| Bilingual copy | Compact bilingual labels | Follow-up uses concise bilingual action labels. |
| Expand/collapse | Detail on demand, no permanent long text | Boss assigned task details are collapsed by default. |

Safety result:

- Production write: no
- Write gate: off
- Migration: no
- Production cutover: `PRODUCTION_NO_GO`

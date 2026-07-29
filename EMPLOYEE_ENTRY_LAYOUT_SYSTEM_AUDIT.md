# Employee Entry Layout System Audit

Task: `EMPLOYEE-FOLLOWUP-MATCH-ENTRY-UX-001`

Scope: read-only UI audit of `deploy-worker/public/employee-v3.html`. No production write, no D1, no migration, no deploy.

| UI Element | Entry Implementation | Follow-up Current | Gap | Required Action |
|---|---|---|---|---|
| Page container | `main.wrap` with max-width token and responsive padding | `#view-arrears` now remains inside the same `main.wrap` | Closed | Keep Follow-up inside Entry shell. |
| Header | `.top`, `.brand`, `.actions` | Same shared header | Closed | No separate Follow-up header. |
| Employee identity area | `.employee-user`, `.employee-identity-card` | Same area, with explicit logout | Closed | Keep one identity display and one logout control. |
| Tab buttons | `.tabs`, `.tab`, `.tab.active` | Same tabbar, only `entry` and `arrears` remain | Closed | Employee Export tab removed. |
| Main card | `.card`, `.head`, `.body` | `#view-arrears.employee-followup-view .card.employee-panel-card` | Closed | Follow-up uses Entry card shell. |
| Card radius | `var(--r2)` / `24px` step cards | Follow-up card uses `var(--r2)` and `.step` card shape | Closed | Reuse Entry radius tokens. |
| Card padding | `.head{22px 26px}`, `.body{26px}`, `.step{20px}` | Follow-up mirrors these values with mobile overrides | Closed | No independent spacing. |
| Card margin | `.card{margin-bottom:24px}`, `.step{margin-bottom:18px}` | Follow-up task cards use `.employee-card.step` | Closed | Reuse Entry rhythm. |
| Title size | `.title{font-size:26px}` | `.employee-followup-view .title{font-size:26px}` | Closed | Same title scale. |
| English subtitle size | `.small{font-size:14px}` | Follow-up subtitle uses `.small` | Closed | Same bilingual subtitle scale. |
| Button height | `.btn` and `.mini-btn` tokens | Follow-up refresh/details/submit use `.btn` / `.mini-btn` | Closed | Same button classes. |
| Button active state | `.btn.primary`, `.tab.active` | Follow-up uses `btn primary` and shared tab active state | Closed | Same active visual. |
| Button inactive state | `.btn`, `.tab` | Follow-up uses same classes | Closed | Same inactive visual. |
| Mobile breakpoint | `@media(max-width:720px)` | Follow-up overrides exist only under same breakpoint | Closed | Same mobile strategy. |
| Bilingual rule | English helper via `.label-en`, short bilingual labels | Follow-up uses English-first labels | Closed | Keep concise copy. |
| Entry card interaction | Step/card, primary button, form inputs | Follow-up details expand into same form control style | Closed | Keep details as the form layer. |

Conclusion:

- `FOLLOWUP_CAN_REUSE_ENTRY_COMPONENTS`: yes.
- `FOLLOWUP_HAS_DUPLICATE_STYLE_SYSTEM`: reduced; Follow-up now uses shared classes/tokens.
- `SHARED_EMPLOYEE_LAYOUT_REQUIRED`: implemented through shared CSS classes/style tokens.
- `UNKNOWN`: no.

# Production Copy Row Backfill 007 Reconciliation Result

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

Conclusion: `MANUAL_REQUIRED`

| Area                            | Result             | Evidence                                                 | Notes                                                                  |
| ------------------------------- | ------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Money reconciliation            | PASS_WITH_WARNINGS | 0 post-backfill mismatch counts                          | Copy `*_fils` values match reviewed legacy decimal values.             |
| Backend totals                  | PASS_WITH_WARNINGS | Active transaction totals remain readable                | Authority switch still depends on production approval.                 |
| Receivables                     | MANUAL_REQUIRED    | 0 receivables / events / allocations rows                | No receivables data insert executed; lifecycle mapping remains manual. |
| Tenant/property scope           | PASS_WITH_WARNINGS | Missing scope rows reduced to 0 in updated legacy tables | Uses legacy compatibility fallback, not final SaaS tenant authority.   |
| Audit/event scope               | PASS_WITH_WARNINGS | 108 audit logs and 8 entry events scoped                 | Visibility policy still needs production review.                       |
| Legacy CORPID warnings          | MANUAL_REQUIRED    | `corpid` remains preserved                               | Legacy fallback remains compatibility only.                            |
| TOP_25 money risks intersection | MANUAL_REQUIRED    | Copy money backfill succeeded                            | TOP_25 risk closure still requires accounting signoff.                 |
| Rollback                        | MANUAL_REQUIRED    | Backup exists; rollback not executed                     | Copy rollback rehearsal should be a separate approval task.            |

Final decision: copy-only row-level compatibility backfill succeeded with
warnings. Production remains `PRODUCTION_NO_GO`; next step is manual
reconciliation review and rollback rehearsal, not cutover.

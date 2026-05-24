# P0-001I Live Route Cutover Decision Matrix

Date: 2026-05-24

| Decision            | Recommended Option                                                            | Alternatives                            | Risk                                                     | Blocks Implementation? | Needs Human Approval |
| ------------------- | ----------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------- | ---------------------- | -------------------- |
| Cutover target      | Local/staging-only `/api/employee/entry` feature-flag rehearsal               | Direct production switch                | Direct switch can corrupt accounting data                | Yes for production     | Yes                  |
| Feature flag        | `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true` plus non-production `APP_ENV` | Reuse staging draft flag                | Shared flags make rollback ambiguous                     | Yes                    | Yes                  |
| Production behavior | Production must stay on legacy route until explicit approval                  | Production returns disabled error       | Changing production behavior without migration is unsafe | Yes                    | Yes                  |
| Live route mode     | Adapter pre-validation plus no production authority switch                    | Replace live write path immediately     | Replacement changes accounting results                   | Yes                    | Yes                  |
| Write target        | Local/staging can write only after schema and reconciliation are present      | Write to production legacy tables       | Unsafe without rollback and reconciliation               | Yes                    | Yes                  |
| Legacy fields       | Keep legacy fields during rehearsal                                           | Delete or ignore legacy fields          | Breaks dashboard/history and rollback                    | Yes                    | Yes                  |
| Minor-unit fields   | Use `*_fils` only where local/staging schema supports them                    | Force all legacy tables to integer-only | Requires production migration                            | Yes                    | Yes                  |
| Dashboard reads     | Keep live dashboard unchanged during rehearsal                                | Switch dashboard to minor-unit fields   | Dashboard mismatch without full reconciliation           | Yes                    | Yes                  |
| Frontend totals     | Never authoritative                                                           | Accept frontend totals as truth         | Accounting manipulation risk                             | Yes                    | No                   |
| Receivables         | Do not block draft route; block production cutover                            | Implement receivables now               | P0-008 is separate model work                            | Blocks production      | Yes                  |
| Tenant scope        | Keep current corpid limitation documented                                     | Attempt full tenant rewrite now         | P0-006 requires separate migration                       | Blocks SaaS production | Yes                  |
| Audit               | Every real write must create audit/entry events                               | Rely on frontend log                    | Untraceable accounting mutation                          | Yes                    | Yes                  |
| Rollback            | Feature flag off must restore legacy path                                     | Git revert only                         | Git revert is too slow for live incident                 | Yes                    | Yes                  |
| Staging QA          | Required before any production change                                         | Skip to production                      | Commercially unsafe                                      | Yes                    | Yes                  |

## Gate Conclusion

P0-001I should only prepare a future local/staging live-route switch rehearsal. Production cutover remains blocked by schema migration, reconciliation, dashboard read authority, receivables, tenant isolation, and human accounting review.

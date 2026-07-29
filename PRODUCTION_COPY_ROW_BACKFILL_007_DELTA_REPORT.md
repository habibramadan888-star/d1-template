# Production Copy Row Backfill 007 Delta Report

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

| Delta Area              | Before                         | After                       | Result            | Notes                                               |
| ----------------------- | ------------------------------ | --------------------------- | ----------------- | --------------------------------------------------- |
| Business row counts     | Existing legacy row counts     | unchanged                   | PASS              | No row count increase/decrease in updated tables.   |
| Transaction money fils  | 232 missing rows               | 0 missing rows              | PASS              | 232 transaction rows populated.                     |
| Arrears money fils      | 6 missing rows                 | 0 missing rows              | PASS              | 6 arrears rows populated.                           |
| Arrear task money fils  | 1 missing row                  | 0 missing rows              | PASS              | 1 arrear task row populated.                        |
| Tenant scope rows       | 0 scoped inspected legacy rows | scoped rows populated       | PASS_WITH_WARNING | Compatibility mapping only; not final SaaS mapping. |
| Audit/event scope rows  | 0 scoped audit/event rows      | 116 scoped audit/event rows | PASS_WITH_WARNING | Compatibility visibility only; policy still review. |
| Receivables rows        | 0 rows                         | 0 rows                      | MANUAL_REQUIRED   | No lifecycle data insert executed.                  |
| Handover future rows    | 0 rows                         | 0 rows                      | MANUAL_REQUIRED   | No handover commit representation generated.        |
| Unexpected row deletion | none expected                  | none detected               | PASS              | No `DELETE` executed.                               |
| Unexpected table drop   | none expected                  | none detected               | PASS              | No `DROP` executed.                                 |

Warnings:

- Tenant/property values are legacy compatibility rehearsal values, not final
  production SaaS tenant authority.
- Receivables data backfill remains manual-required.
- Rollback execution was not performed in this task.
- Production remains `PRODUCTION_NO_GO`.

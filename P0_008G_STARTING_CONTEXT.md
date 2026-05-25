# P0-008G Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: receivables staging/local authority switch rehearsal. This task does not
deploy, migrate, write D1 rows, call production, mutate live dashboard output, or
enable remote feature flags.

## Prior Evidence

| Area                             | Current Evidence                                      | Result           | Notes                                                                                               |
| -------------------------------- | ----------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| P0-008C local/staging rehearsal  | `RECEIVABLES_LOCAL_STAGING_REHEARSAL_RESULT.md`       | PASS             | Pure receivables module and dry-run rehearsal passed.                                               |
| P0-008D staging shadow gate      | `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md`     | PASS             | Shadow comparison has no mismatch or blocker.                                                       |
| P0-008E staging shadow rehearsal | `RECEIVABLES_STAGING_SHADOW_DATA_SEED_RESULT.md`      | PASS             | Controlled staging QA data covers due, overdue, repayment, adjustment, void, and deposit scenarios. |
| P0-008F authority switch gate    | `RECEIVABLES_STAGING_AUTHORITY_SWITCH_GATE_RESULT.md` | PASS             | Six authority switch candidates matched and zero blockers were found.                               |
| Commercial launch gate           | `COMMERCIAL_LAUNCH_READINESS_RESULT.md`               | PRODUCTION_NO_GO | Production remains blocked.                                                                         |

## Staging Authority Candidates

The following matched candidates can enter staging/local authority switch
rehearsal:

- rent received
- rent due
- arrears outstanding
- due today
- overdue amount
- arrears total

The following remain shadow-only or accounting-review-only:

- adjustment credit
- adjustment debit
- legacy decimal warning rows
- deposit handling evidence
- void impact evidence
- dashboard live result guard

## Minimal Safe Scope

P0-008G uses local staging-mode evaluation of
`ENABLE_RECEIVABLES_AUTHORITY_STAGING=true` without enabling a remote flag. It
records before/during/after values and verifies rollback to legacy behavior when
the flag is false.

## Rollback Mechanism

Rollback is `ENABLE_RECEIVABLES_AUTHORITY_STAGING=false`. In this task the flag
was not enabled remotely, so rollback is verified by the local evaluation mode:
before=false, during=true, after=false.

## Production Boundary

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL call: no.
- Production feature flag: no.
- Production cutover: NO-GO.
- P0-008 status after success: Partial only, not Verified.

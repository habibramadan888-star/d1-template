# Commercial Launch Manual Signoff Instructions

Date: 2026-05-27, Asia/Dubai

Audience: project owner, accounting/finance reviewer, engineering owner,
operations owner, rollback owner, deployment owner, and business owner.

## How To Review

1. Open `COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md`.
2. For each signoff ID assigned to you, open the evidence file listed in that
   row.
3. Decide whether the evidence supports one of these outcomes:
   `APPROVED`, `REJECTED`, `MANUAL_REQUIRED`, or `BLOCKED`.
4. Record the decision, reviewer name/team, date, and notes in the next signoff
   update task.

## When To Reject

Reject if:

- The evidence is stale, incomplete, or does not match the production target.
- The approval would permit production write without a fresh backup.
- SQL, row counts, or rollback steps are unclear.
- Accounting values or receivables semantics are not acceptable.
- Tenant/property mapping relies on legacy `CORPID` as final SaaS authority.
- Feature flags, deploy target, or rollback owner are ambiguous.

## Approve For Dry-run Only

Approve for dry-run only when the evidence is enough to run a rehearsal on a
copy or staging resource, but not enough for production. This is appropriate for
reviewing migration SQL, row-level backfill, rollback, monitoring, or
reconciliation before final production approval.

## Approve For Production

Approve production only if:

1. The approval explicitly names the production target and action.
2. A fresh production backup and rollback plan are approved.
3. SQL, flags, row counts, and verification steps are exact.
4. Accounting and business owner signoff are complete.
5. The cutover window and rollback owner are assigned.
6. The reviewer accepts the residual risk in writing.

## Why Staging Passed Is Not Production Ready

Staging proves behavior in a safer environment. It does not prove production
data shape, production row counts, production rollback, production permissions,
or business acceptance.

## Why Production-copy Passed Is Not Production Ready

Production-copy uses production-like data without writing the original
production D1. It proves rehearsal feasibility, but it does not authorize live
production mutation, deploy, feature flags, or cutover.

## What Each Signoff Should Include

Each signoff should include:

- Signoff ID.
- Decision: `APPROVED`, `REJECTED`, `MANUAL_REQUIRED`, or `BLOCKED`.
- Reviewer person/team.
- Date/time.
- Evidence file reviewed.
- Scope: dry-run only or production approval.
- Any required conditions.
- Explicit note if production remains `PRODUCTION_NO_GO`.

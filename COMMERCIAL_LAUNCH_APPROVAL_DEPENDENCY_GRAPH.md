# Commercial Launch Approval Dependency Graph

Date: 2026-05-27, Asia/Dubai

Scope: dependency planning only. This graph does not approve production write,
production migration, production deploy, feature flags, dashboard switch, or
commercial cutover.

## Before Production D1 Backup

Required first:

- SO-001 production D1 target confirmation.
- SO-002 backup approval, including output path, retention, integrity check,
  and storage outside git.
- SO-020 rollback owner approval for who can decide restore versus reverse
  update.

Parallel review allowed:

- Money risk decisions, tenant/property mapping review, receivables/accounting
  review, monitoring checklist, and feature flag packet drafting.

## Before Production Migration

Required first:

- SO-001 production D1 target confirmation.
- SO-002 production backup approval and backup completion.
- SO-003 restore / rollback method approval.
- SO-004 final production migration SQL approval.
- SO-005 exact row-level backfill approval.
- SO-006 money reconciliation approval.
- SO-007 TOP_25 money risk approval or explicit accepted exceptions.
- SO-008 tenant/property final SaaS mapping approval.
- SO-009 legacy `CORPID` fallback policy approval.
- SO-010 and SO-011 receivables lifecycle/allocation approval.
- SO-012 audit/event scope approval.
- SO-020 rollback owner approval.

Still forbidden until those are complete:

- Production D1 execute.
- Production migration.
- Production backfill.

## Before Production Deploy

Required first:

- All migration and backfill signoffs above.
- SO-013 backend totals authority approval.
- SO-014 employee entry cutover approval.
- SO-015 handover atomic cutover approval.
- SO-016 exact production feature flag states and rollback values.
- SO-017 deploy owner approval, deploy target, verification steps, and freeze
  window.
- SO-019 post-cutover monitoring approval.

Still forbidden until those are complete:

- Worker production deploy.
- Production feature flag enablement.
- Dashboard authority switch.

## Before Cutover

Required first:

- SO-017 production deploy approval and completed preflight verification.
- SO-018 production cutover window approval.
- SO-019 monitoring and escalation approval.
- SO-020 rollback owner and trigger criteria.
- Business owner acceptance that preflight approval is no longer enough and
  production cutover is being explicitly authorized.

Still forbidden until those are complete:

- Commercial launch GO.
- Business cutover.
- Treating any Partial P0 as Verified.

## Approvals That Can Be Reviewed In Parallel

- SO-006 and SO-007 money/accounting review.
- SO-008 and SO-009 tenant/property and legacy fallback review.
- SO-010 and SO-011 receivables lifecycle/allocation review.
- SO-012 audit/event scope review.
- SO-013 through SO-015 authority/cutover criteria review.
- SO-019 monitoring and SO-020 rollback owner review.

## Still BLOCKED

- SO-017 production deploy approval remains `BLOCKED` until migration,
  accounting, tenant, rollback, feature flag, and monitoring approvals close.
- SO-018 production cutover window approval remains `BLOCKED` until production
  deploy readiness, rollback readiness, monitoring, and business acceptance are
  complete.

Current production cutover status: `PRODUCTION_NO_GO`.

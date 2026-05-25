# Post Staging QA Next Action Plan

Generated: 2026-05-25

Scope: recommend safe next engineering work after real staging QA passed and
staging feature flags were rolled back. This plan does not authorize production
deploy, production migration, or production cutover.

## Route A: Safest Route

Task: `P0-003D backend totals staging switch gate`

Goal:

- Continue backend totals authority work in local/staging only.
- Add staging switch evidence without changing production dashboard authority.
- Keep production cutover `NO-GO`.

Why first:

- It directly reduces dashboard/accounting authority risk.
- It can be rehearsed in staging without production migration.
- It creates evidence needed before any production cutover discussion.

Boundary:

- No production deploy.
- No production migration.
- No live dashboard switch.
- No P0-003 `Verified` status.

## Route B: Financial Model Route

Task: `P0-008C receivables local/staging rehearsal`

Goal:

- Rehearse receivables lifecycle in local/staging.
- Validate rent due, short pay, repayment, void, and outstanding balance design.
- Keep dashboard and production financial formulas unchanged.

Boundary:

- No production schema migration.
- No production receivables table rollout.
- No formal production arrears replacement.

## Route C: SaaS Architecture Route

Task: `P0-006C tenant/property scope local/staging rehearsal`

Goal:

- Rehearse tenant/property scope enforcement with local/staging fixtures.
- Add denial tests for cross-tenant and cross-property access.
- Keep production auth behavior unchanged.

Boundary:

- No production tenant migration.
- No global query rewrite.
- No production deployment.

## Recommendation

Recommended next task: `P0-003D backend totals staging switch gate`.

Rationale: backend totals authority is the most direct next production blocker
after employee entry and handover staging QA. It also provides concrete
dashboard/history evidence without requiring production migration.

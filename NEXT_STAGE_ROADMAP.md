# Next Stage Roadmap

Date: 2026-05-26, Asia/Dubai

Current launch status: `PRODUCTION_NO_GO`

## Route A: Continue Production Approval Preparation

Scope:

- Prepare approval packets.
- Review production D1 target requirements.
- Prepare production-copy dry-run plan.
- Continue human accounting/data/security review.
- Do not write production.
- Do not deploy production.
- Do not execute production migration.

Why this is safest:

- It converts the existing staging evidence into explicit human approval
  decisions without touching production.
- It keeps rollback, backup, row-count, and accounting gates visible.
- It prevents staging success from being mistaken for production readiness.

## Route B: Continue Staging Hardening

Scope:

- Continue owner/employee manual QA.
- Add edge-case staging evidence for audit logs, entry events, dashboard/history,
  void/rollback, and owner flow.
- Keep production untouched.
- Do not deploy.
- Do not migrate production.

When to use:

- If reviewers want more confidence before any production-copy work.
- If owner dashboard/history, export/report, or manual employee flows need more
  observable evidence.

## Route C: Prepare Production Dry-Run On Copy

Scope:

- Create or confirm a production copy after explicit approval.
- Back up first.
- Apply migration/backfill only to the copy.
- Verify row counts, rollback, accounting totals, tenant scope, and access
  matrix on the copy.
- Do not write live production.
- Do not deploy production.
- Do not run live production migration.

When to use:

- After Route A reviewers approve a production-copy target, backup, rollback,
  and exact SQL/update plan.

## Recommendation

Recommended route: Route A.

Rationale: the project has strong staging/local evidence, but production
approval is not complete. Route A creates the least-risk path to convert
staging evidence into explicit owner decisions. Route C should come after Route
A approves a production copy and rollback procedure. Route B is useful in
parallel if owner-flow confidence needs more staging evidence.

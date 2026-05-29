# Internal Testing Execution Guide

Start date: 2026-05-30

Duration: 4 to 5 weeks.

Scope: enterprise-grade internal testing before public production release.

Status: ready to start. Production remains `PRODUCTION_NO_GO`.

## Quick Start: First 24 Hours

### Day 1 Morning: Team Kickoff

Time: 9:00 AM.

Duration: 1 hour.

Attendees:

- Backend Lead.
- DevOps Lead.
- QA Lead.
- Finance Lead.
- Product Manager.

Agenda:

1. Mission statement.
2. Quality framework overview.
3. Role assignments.
4. Daily standup schedule.
5. Communication channels.
6. Q&A.

Required reference documents:

- `docs/QUALITY_OBJECTIVES.md`
- `docs/DETAILED_TIMELINE.md`
- `docs/RISK_ASSESSMENT.md`
- `docs/QUALITY_GATES.md`
- `docs/READONLY_SMOKE_TEST.md`

### Day 1 Afternoon: Environment Check

Owner: DevOps Lead.

Duration: 2 hours.

Checklist:

- Staging database exists or a fresh staging database is prepared.
- Staging Worker can be deployed through approved non-production flow.
- Monitoring and alerting channels are configured.
- Logs aggregation works.
- Backup and restore procedure is verified.
- Performance baseline can be recorded.
- Feature flag state is visible.

Result:

- PASS: ready for Phase 0 smoke testing.
- FAIL: fix environment issue and recheck before Phase 0.

### Day 1 Evening: Smoke Test Preparation

Owner: QA Lead.

Duration: 2 hours.

Actions:

1. Read `docs/READONLY_SMOKE_TEST.md`.
2. Create the smoke test result sheet.
3. Confirm test accounts through a secure channel.
4. Confirm screenshots/evidence location.
5. Brief assigned testers.

## Daily Workflow

### Daily Standup

Time: 9:00 AM.

Duration: 15 minutes.

Each participant reports:

```text
Name:
Role:
Current phase:

Blockers:
- None, or blocker with owner and ETA.

Accomplishments:
- Completed items from yesterday.

Plan:
- Tasks targeted for today.

Risks:
- New risks or changed risk status.
```

Product Manager responsibilities after standup:

- Update progress tracking.
- Create issue tickets for blockers.
- Escalate blockers older than 4 hours.
- Confirm owner and ETA for every P0 issue.

### Daily Evidence Rules

Every test day must record:

- Date.
- Environment.
- Commit SHA.
- Feature flag state.
- Test command or manual test sheet.
- Result summary.
- Failures with screenshot or log link.

## Weekly Check-In

Time: Friday 4:00 PM.

Duration: 30 minutes.

Attendees: all leads and Product Manager.

Agenda:

1. Phase progress review.
2. Risk review.
3. Quality metrics.
4. Next-week plan.
5. Go/no-go decision for phase promotion.

Required output:

- Updated progress tracker.
- Updated blocker list.
- Updated risk status.
- Phase decision recorded.

## Phase 0: Readonly Smoke Test

Duration: 1 to 2 days.

Owner: QA Lead.

Risk level: low.

Goal: verify the current system is stable enough to start implementation work.

Execution:

- Prepare test data and accounts.
- Run all readonly smoke tests.
- Record latency for performance-sensitive tests.
- Capture screenshots for failures.
- Compile pass/fail result.

Go criteria:

- At least 29 of 30 tests pass.
- No critical failure.
- No auth blocker.
- No cross-tenant data exposure.
- No 5xx pattern.

No-go criteria:

- Any data leak.
- Any login blocker.
- Any dashboard or history hard failure.
- Any admin write permission issue.

## Phase 1: Code Implementation

Duration: 1 to 2 weeks.

Owner: Backend Lead and DevOps Lead.

Risk level: medium.

Branch strategy:

```bash
git checkout fix/auth-closure-001
git checkout -b internal/impl-phase-1
```

Rules:

- Do not merge implementation work directly to `master`.
- Keep feature flags default off.
- Do not deploy to production.
- Do not write production D1.
- Do not run production migrations.

Exit gate:

- `IMPL-001` through `IMPL-006` are code complete or explicitly deferred with approval.
- Feature flag infrastructure is ready.
- Staging is stable for 24 hours.
- No critical readonly bug is open.

## Phase 2a: Readonly Feature Testing

Duration: 5 days.

Owner: QA Lead.

Risk level: low.

Daily focus:

- Day 1: backend totals authority candidate.
- Day 2: receivables readonly state visibility.
- Day 3: tenant isolation readonly queries.
- Day 4: audit trail readonly inspection.
- Day 5: full readonly integration.

Go criteria:

- 50 or more readonly tests pass.
- Error rate below 0.1 percent.
- Latency within baseline plus 20 percent.
- Finance spot-check confirms sampled calculations.

## Phase 2b: Write Operations Testing

Duration: 5 to 10 days.

Owner: Backend Lead and QA Lead.

Risk level: medium.

Coverage:

- Receivables transitions.
- Tenant isolation on writes.
- Audit trail on writes.
- Handover idempotency.
- Full workflow: entry to payment to handover to audit.
- Stress and edge cases.

Go criteria:

- 100 or more write tests pass.
- Zero data corruption.
- Money precision sample of 100 transactions passes.
- Tenant isolation matrix passes.
- Audit trail coverage passes.
- Finance signs off money behavior.

## Phase 2c: Failure Scenarios

Duration: 5 to 10 days.

Owner: Backend Lead and DevOps Lead.

Risk level: high.

Required scenarios:

- Network failure during handover.
- Database connection loss.
- Concurrent writes to same receivable.
- Feature flag toggle during in-flight transaction.
- Resource pressure or degraded environment.

Go criteria:

- Failure scenarios recover without data corruption.
- Rollback procedures complete within target time.
- Engineering and QA sign off.
- All P0 risks are mitigated.

## Phase 3: Production-Copy Dry-Run

Duration: 5 days.

Owner: DevOps Lead and Engineering Lead.

Risk level: high, but isolated from production.

Execution:

1. Restore production data to production-copy.
2. Deploy code to production-copy with feature flags off.
3. Verify old-path behavior.
4. Progressively enable flags.
5. Run full validation.
6. Test rollback.
7. Collect sign-offs.

Go criteria:

- Dry-run passes.
- Performance metrics pass.
- Rollback is tested.
- Finance, engineering, product, QA, DevOps, and owner approvals are recorded.

## Communication Protocol

Daily status format:

```text
[Team] [Phase] [Status] [Blocker]

Example:
Backend | Phase 2b | IMPL-002 80 percent complete | No blockers
QA | Phase 2b | 45/50 write tests pass | Race-condition investigation open
```

Weekly email content:

- Current phase.
- Progress percentage.
- Test pass rate.
- Bug count by severity.
- Blockers.
- Risks.
- Next-week focus.

## Escalation Procedure

Red alert triggers:

- Money mismatch.
- Cross-tenant data leak.
- Partial handover.
- Unauthorized write.
- Three consecutive failures on the same P0 feature.

Immediate actions:

1. Stop the affected test path.
2. Alert engineering and QA leads.
3. Start root cause analysis.
4. Roll back if feature flags or data state require it.
5. Record evidence and decision.

Yellow alert trigger:

- Any blocker older than 4 hours.

Action:

- Escalate to owner and Product Manager.
- Update blocker status hourly until resolved.

## Release Decision

If every gate passes:

1. Prepare final release package.
2. Confirm production readiness status.
3. Merge only through approved release process.
4. Roll out gradually.
5. Monitor for 48 hours.

If any gate fails:

1. Do not release.
2. Fix root cause.
3. Re-run the failed gate.
4. Prioritize quality over schedule.

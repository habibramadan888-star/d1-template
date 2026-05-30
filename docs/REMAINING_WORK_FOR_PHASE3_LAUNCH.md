# Remaining Work Before Phase 3 Launch

Generated: 2026-05-30

Current repository status: ready for Phase 3 planning.

Production status: `PRODUCTION_NO_GO`.

This checklist tracks the final work that must be completed outside the repository before a real production-copy dry-run can start. It does not mark Phase 3 as passed and does not authorize production deployment.

## Required Before Starting The 24-Hour Dry-Run

### 1. Production-Copy Environment

- [ ] Production-copy D1 database exists and is isolated from production.
- [ ] Production-copy schema matches the release candidate schema.
- [ ] Production-copy data restore is complete from a known snapshot.
- [ ] Production-copy secrets are isolated from production secrets.
- [ ] Production-copy Worker URL is documented.
- [ ] Network access between production and production-copy is intentionally separated.
- [ ] Backup restore has been rehearsed and timed.

### 2. Monitoring And Alerting

- [ ] Request rate, error rate, latency, Worker exceptions, and D1 query latency are visible.
- [ ] Error-rate alert is configured.
- [ ] P95/P99 latency alert is configured.
- [ ] Money discrepancy alert is configured.
- [ ] Cross-tenant access alert is configured.
- [ ] Logs are retained for the full dry-run and review window.
- [ ] Alert destination has been tested with a synthetic alert.

### 3. Team Readiness

- [ ] Engineering lead is assigned for the full window.
- [ ] QA lead is assigned for the full window.
- [ ] DevOps/infrastructure lead is assigned for the full window.
- [ ] Finance/compliance owner is assigned for money and receivables checks.
- [ ] Product owner is assigned for workflow acceptance.
- [ ] Owner/CEO approval owner is assigned for final GO/NO-GO.
- [ ] War room, escalation path, and decision owners are documented.

### 4. Runbooks And Scripts

- [ ] `PHASE_3_EXECUTION_RUNBOOK.md` reviewed.
- [ ] `PHASE_3_REALTIME_MONITORING_RUNBOOK.md` reviewed.
- [ ] `PHASE_3_ROLLBACK_RUNBOOK.md` reviewed.
- [ ] `scripts/phase3-deploy.sh` dry-run executed.
- [ ] `scripts/phase3-monitor-hourly.mjs` dry-run executed.
- [ ] `scripts/phase3-rollback.sh` dry-run executed.

### 5. Final Repository Verification

- [ ] `npm run typecheck` passes.
- [ ] `npm run security:secrets` passes.
- [ ] `npm run test` passes.
- [ ] `npm run gate:commercial-launch` returns `PRODUCTION_NO_GO`.
- [ ] Phase 0, Phase 1, Phase 2A, and Phase 3 readiness reports are present.

## Success Criteria

Phase 3 can start only after all of the following are true:

- [ ] Production-copy environment is verified.
- [ ] Monitoring and alerting are active.
- [ ] Backup and rollback are rehearsed.
- [ ] Team ownership is confirmed.
- [ ] Dry-run scripts have been reviewed in dry-run mode.
- [ ] Final GO/NO-GO meeting records `GO for production-copy dry-run`.

Anything less remains `NO-GO` for Phase 3 execution.

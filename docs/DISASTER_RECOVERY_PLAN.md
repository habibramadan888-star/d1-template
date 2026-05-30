# Disaster Recovery Plan

## Targets

- RTO: below 30 minutes.
- RPO: below 4 hours.
- Customer communication: first update within 30 minutes.

## Backup Strategy

- [ ] Hourly automated backups.
- [ ] 24-hour minimum retention.
- [ ] Weekly restore test.
- [ ] Backup encryption enabled.
- [ ] Backup access restricted to approved operators.

## Failure Scenario 1: Worker Runtime Failure

- [ ] Roll back to previous Worker version.
- [ ] Keep feature flags false.
- [ ] Verify health endpoint.
- [ ] Monitor 30 minutes.

## Failure Scenario 2: Database Corruption

- [ ] Stop writes.
- [ ] Restore latest clean backup.
- [ ] Run schema and data integrity checks.
- [ ] Run money reconciliation.
- [ ] Reopen writes only after approval.

## Failure Scenario 3: Complete Environment Outage

- [ ] Activate incident command.
- [ ] Contact cloud provider support.
- [ ] Restore from latest backup into recovery environment.
- [ ] Validate minimum critical flows.
- [ ] Communicate status every 15 minutes.

## Failure Scenario 4: Extended Outage Above 4 Hours

- [ ] Notify all stakeholders.
- [ ] Activate manual operation fallback.
- [ ] Freeze non-critical changes.
- [ ] Prepare post-incident review.

## Incident Communication

- [ ] Internal incident channel opened.
- [ ] Customer notification prepared.
- [ ] Status page updated every 15 minutes.
- [ ] Post-mortem scheduled within 48 hours.

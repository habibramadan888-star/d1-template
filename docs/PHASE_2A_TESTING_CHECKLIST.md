# Phase 2a Readonly Features Testing Checklist

Duration: 5 days.

Owner: QA Lead.

Risk: low.

## Day 1: Backend Totals Authority

- [ ] `/api/dashboard/totals` returns computation metadata.
- [ ] `durationMs` is measured.
- [ ] `rowsChecked` is populated.
- [ ] Totals are internally consistent.
- [ ] Audit computation evidence exists where implemented.
- [ ] Latency remains within baseline.

Decision: [ ] PASS [ ] FAIL

## Day 2: Receivables Readonly State

- [ ] Receivables list loads.
- [ ] `PENDING` rows visible.
- [ ] `PARTIAL` rows visible.
- [ ] `PAID` rows visible.
- [ ] Ledger evidence is visible where implemented.
- [ ] Outstanding amounts are correct.
- [ ] No state conflicts in read model.

Decision: [ ] PASS [ ] FAIL

## Day 3: Tenant Isolation Readonly

- [ ] Employee A sees only assigned property.
- [ ] Employee B sees only assigned property.
- [ ] Owner sees own tenant properties.
- [ ] Owner cannot see other tenant.
- [ ] Readonly admin follows configured scope.
- [ ] Frontend tenant tamper ignored.

Decision: [ ] PASS [ ] FAIL

## Day 4: Audit Trail Readonly

- [ ] Audit logs can be read by authorized users.
- [ ] Unauthorized users cannot read audit logs.
- [ ] Audit rows include required fields.
- [ ] No sensitive credentials appear.
- [ ] Audit reads do not degrade performance.

Decision: [ ] PASS [ ] FAIL

## Day 5: Full Readonly Integration

- [ ] All readonly features work together.
- [ ] 50 concurrent read users test passes.
- [ ] Error rate below 0.1 percent.
- [ ] Latency within baseline plus 20 percent.
- [ ] No cascading failures.

Final decision: [ ] Proceed to Phase 2b [ ] Extend Phase 2a

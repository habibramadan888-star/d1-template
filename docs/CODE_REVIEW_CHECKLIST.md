# Code Review Checklist

Generated: 2026-05-30

Scope: IMPL-001 through IMPL-006 production-code candidates on branch `fix/auth-closure-001`.

## IMPL-001: Dashboard Totals Authority

### Security

- [ ] No SQL injection risks
- [ ] Auth validated
- [ ] Tenant scope enforced
- [ ] Admin scope explicitly handled

### Error Handling

- [ ] Method validation present
- [ ] Database binding validated
- [ ] Authentication dependency validated
- [ ] Errors audited and returned consistently

### Performance

- [ ] Query count bounded
- [ ] No N+1 query pattern
- [ ] Row-count table names allowlisted
- [ ] Computation duration capped

### Correctness

- [ ] Money amounts remain in fils
- [ ] Cash, bank, collected totals computed server-side
- [ ] Overdue and outstanding totals included
- [ ] Audit logging present

Status: [ ] PASS [ ] FAIL

Reviewer: **\*\***\_\_\_\_**\*\***

Date: **\*\***\_\_\_\_**\*\***

---

## IMPL-002: Receivables State Machine

### Transaction Safety

- [ ] `BEGIN TRANSACTION` used for state changes
- [ ] `ROLLBACK` on error
- [ ] `COMMIT` on success
- [ ] Nested transaction behavior controlled

### Business Logic

- [ ] All 7 documented states handled
- [ ] Transitions validated
- [ ] `ADJUSTED` and `WRITTEN_OFF` require approval
- [ ] Oldest-first allocation implemented
- [ ] `VOIDED` restores outstanding amount
- [ ] Ledger entries created

### Testing

- [ ] Valid transitions tested
- [ ] Invalid transitions tested
- [ ] Edge cases covered
- [ ] Concurrent writes covered
- [ ] Failure scenarios covered

Status: [ ] PASS [ ] FAIL

Reviewer: **\*\***\_\_\_\_**\*\***

Date: **\*\***\_\_\_\_**\*\***

---

## IMPL-003: Tenant/Property Isolation

### Data Isolation

- [ ] Tenant filter available
- [ ] Property filter available
- [ ] Cross-tenant access prevented
- [ ] Admin scope explicitly handled
- [ ] Employee property restrictions enforced

### SQL Injection Prevention

- [ ] Parameterized query fragments used
- [ ] No direct tenant/property value interpolation
- [ ] Placeholder count matches params
- [ ] Boundary-aware `WHERE` insertion handles `GROUP BY`, `ORDER BY`, `LIMIT`, and `OFFSET`

### Coverage

- [ ] All list endpoints wired to scope filter
- [ ] All write endpoints wired to authorization checks
- [ ] Owner role retains full tenant visibility
- [ ] Admin role remains read-only where required

Status: [ ] PASS [ ] FAIL

Reviewer: **\*\***\_\_\_\_**\*\***

Date: **\*\***\_\_\_\_**\*\***

---

## IMPL-004: Handover Atomicity

### Idempotency

- [ ] Key validation present
- [ ] Duplicate detection works
- [ ] Cached response returned
- [ ] TTL correct

### Transaction Safety

- [ ] `BEGIN TRANSACTION` used
- [ ] Total mismatch detected before write commit
- [ ] `ROLLBACK` on error
- [ ] No partial handovers possible

### Validation

- [ ] Entry count validated
- [ ] Amount validation present
- [ ] Tenant-scoped entry update present
- [ ] Unsupported payment methods rejected

Status: [ ] PASS [ ] FAIL

Reviewer: **\*\***\_\_\_\_**\*\***

Date: **\*\***\_\_\_\_**\*\***

---

## IMPL-005: Schema Verify

### Table Verification

- [ ] Required tables checked
- [ ] Index verification present
- [ ] Clear missing-table errors
- [ ] Unsupported DB adapter fails clearly

### Migration Safety

- [ ] No runtime DDL in verification module
- [ ] Verification can run on startup
- [ ] Graceful missing-index warnings
- [ ] Logging present

Status: [ ] PASS [ ] FAIL

Reviewer: **\*\***\_\_\_\_**\*\***

Date: **\*\***\_\_\_\_**\*\***

---

## IMPL-006: Audit Logger

### Logging

- [ ] Operation type captured
- [ ] Resource type captured
- [ ] User ID and role captured when available
- [ ] Status tracked

### Data Safety

- [ ] Serialization safe
- [ ] Sensitive keys redacted
- [ ] Truncation present
- [ ] Size limits enforced
- [ ] Error handling present

### Query

- [ ] Query helper returns resource audit history
- [ ] Resource ID filter works
- [ ] Limit enforced
- [ ] Route wiring verified

Status: [ ] PASS [ ] FAIL

Reviewer: **\*\***\_\_\_\_**\*\***

Date: **\*\***\_\_\_\_**\*\***

---

## Overall Assessment

Total items: 54

- [ ] All PASS
- [ ] Minor issues documented
- [ ] Major issues require fix before next gate

Recommendation: [ ] APPROVED FOR INTERNAL TESTING [ ] NEEDS FIXES [ ] REJECTED

Sign-Off: **\*\***\_\_\_\_**\*\***

Date: **\*\***\_\_\_\_**\*\***

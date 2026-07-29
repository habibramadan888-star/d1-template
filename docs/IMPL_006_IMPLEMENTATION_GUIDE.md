# IMPL-006: Audit Trail Implementation Guide

Status: ready for implementation.

Owner: Backend Lead.

Duration: 2 hours.

Risk: medium.

## Objective

Ensure every mutation has complete audit evidence and audit logs are queryable by authorized users.

## Required Audit Fields

- Operation type.
- Resource type.
- Resource ID.
- User ID.
- User role.
- Tenant ID.
- Property ID where applicable.
- Old value.
- New value.
- Changed fields.
- Reason.
- Status.
- Error message for failed attempts.
- Timestamp.

## Implementation Checklist

- Implement `recordAuditLog`.
- Add audit calls to all write endpoints.
- Log failed mutation attempts where safe.
- Add readonly audit query endpoint for owner/admin roles.
- Ensure audit failures do not expose secrets.
- Decide whether audit failures block main operations for P0 financial writes.

## Write Endpoints to Cover

- Entry add/edit/delete/void.
- Payment add/void.
- Handover submit/verify.
- Receivable transition.
- Deposit actions.
- Settings mutations.
- Customer mutations.

## Tests to Write

- Entry create logs insert.
- Entry edit logs old and new values.
- Payment logs amount and method.
- Handover logs totals and entry count.
- Denied readonly admin write logs failed attempt if policy requires.
- Audit query returns resource history.

## Definition of Done

- All mutation endpoints covered.
- Query endpoint works.
- Required fields complete.
- Secrets absent from audit logs.
- QA spot-check passes.

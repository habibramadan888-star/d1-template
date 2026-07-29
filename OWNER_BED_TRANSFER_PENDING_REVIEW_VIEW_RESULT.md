# Owner Bed Transfer Pending Review View Result

Date: 2026-06-01
Status: IMPLEMENTED

## Owner API

`GET /api/owner/bed-transfers?status=pending_review`

Returns pending Bed Transfer event-ledger rows for the owner scope.

## Owner Overview

The owner comparative overview includes a `Bed Transfer Review` card showing:

- pending review count
- from bed to to bed
- transfer date
- operator employee
- reason
- review-only safety note

## Readonly Admin

Readonly admin can read the view through owner read permissions, but no write route is exposed through this view.

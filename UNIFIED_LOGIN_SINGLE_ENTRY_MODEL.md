# Unified Login Single Entry Model

Date: 2026-05-28, Asia/Dubai

Production status: `PRODUCTION_NO_GO`.

## Decision

The system has one primary login entry:

`https://homelink-finance.habibramadan888.workers.dev/unified-login.html`

There is no separate owner login page and no separate employee login page for QA
or product guidance.

## Role Destinations

| Page                 | Role in the system     | Login entry? | Notes                                                                |
| -------------------- | ---------------------- | -----------: | -------------------------------------------------------------------- |
| `unified-login.html` | Single login page      |          Yes | Employees, owners, managers, and admins start here.                  |
| `employee-v3.html`   | Employee business page |           No | Destination after `/api/me` confirms `employee` or `staff`.          |
| `index.html`         | Owner business page    |           No | Destination after `/api/me` confirms `owner`, `manager`, or `admin`. |

## Authority

| Rule                                                                     | Status   |
| ------------------------------------------------------------------------ | -------- |
| Login success is routed by server-confirmed role.                        | Required |
| `/api/me` or the server auth response is the authority.                  | Required |
| Frontend role, localStorage, tenant_id, or property_id is not authority. | Required |
| Unknown roles are denied and must not enter a business page.             | Required |

## Boundary

This model does not approve production D1 writes, migrations, feature flags,
dashboard authority switch, business writes, or commercial launch.

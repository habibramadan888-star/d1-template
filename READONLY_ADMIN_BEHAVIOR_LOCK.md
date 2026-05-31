# Readonly Admin Behavior Lock

## Role Definition

`readonly_admin` and `admin_readonly` are observation roles. They can inspect owner-side data but cannot perform business writes.

## Allowed

| readonly_admin Action   | Allowed                        |
| ----------------------- | ------------------------------ |
| View overview           | yes                            |
| View arrears module     | yes                            |
| View history            | yes                            |
| View analysis           | yes                            |
| View clients            | yes                            |
| View network if exposed | yes                            |
| View details            | yes                            |
| Call GET APIs           | yes, subject to endpoint scope |

## Forbidden

| readonly_admin Action    | Allowed | Backend Expected |
| ------------------------ | ------- | ---------------- |
| Dispatch staff directive | no      | 403              |
| Modify note              | no      | 403              |
| Modify promise date      | no      | 403              |
| Confirm close            | no      | 403              |
| Void                     | no      | 403              |
| Delete                   | no      | 403              |
| Enter rent payment       | no      | 403              |
| Enter deposit            | no      | 403              |
| Modify settings          | no      | 403              |
| Any business write       | no      | 403              |

## Current Evidence

| Layer                         | Evidence                                                                                                       | Status                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Backend role set              | `READONLY_ADMIN_ROLES = ["admin_readonly", "readonly_admin"]`                                                  | Present                  |
| Backend broad write guard     | `if(isReadonlyAdminRoleValue(user?.role)&&request.method!=="GET")return forbidden()` before arrear task writes | Present                  |
| `/api/me`                     | Returns `isReadonlyAdmin` and `canWrite`                                                                       | Present                  |
| Owner frontend shell          | Maps readonly roles to `readonly_admin`; toggles `readonly-admin` class                                        | Present                  |
| Owner card actions            | `renderArrearCardActions()` returns detail-only when not write role                                            | Present                  |
| Settings/wifi/customer config | Some routes return readonly payloads or forbid writes                                                          | Needs per-endpoint tests |

## Required Regression Matrix

1. readonly_admin can open overview.
2. readonly_admin can open arrears.
3. readonly_admin can open history.
4. readonly_admin can open analysis.
5. readonly_admin can open clients.
6. readonly_admin sees only detail buttons on arrears cards.
7. readonly_admin POST `/api/arrear_tasks/directive` returns 403.
8. readonly_admin POST `/api/arrear_tasks/update` returns 403.
9. readonly_admin cannot access entry write UI.
10. readonly_admin settings write returns 403 or readonly payload.

## Owner Arrears Batch UI Lock

- readonly_admin can view arrears cards.
- readonly_admin can expand card details.
- readonly_admin can use read-only WhatsApp export.
- readonly_admin must not see select-all or send-employee controls.
- readonly_admin card actions remain detail-only.
- Production cutover remains `PRODUCTION_NO_GO`.

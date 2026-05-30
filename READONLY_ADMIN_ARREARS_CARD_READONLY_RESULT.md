# READONLY_ADMIN_ARREARS_CARD_READONLY_RESULT

## Result

`readonly_admin` can view owner arrears cards but does not receive write actions.

## UI Behavior

| Behavior                               | Status |
| -------------------------------------- | ------ |
| View arrears cards                     | yes    |
| Show `详情`                            | yes    |
| Show `下发员工`                        | no     |
| Show `确认关闭`                        | no     |
| Show void/delete actions               | no     |
| Show checkbox selection for directives | no     |

## Enforcement

The UI uses `isOwnerWriteRole()` for card action rendering. Existing backend write guards and role checks remain unchanged, so write requests by readonly roles still fail with authorization enforcement.

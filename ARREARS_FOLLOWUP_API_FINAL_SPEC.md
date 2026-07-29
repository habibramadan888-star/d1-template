# Arrears Follow-up API Final Spec

Status: API design only  
Implementation: approval required

## Common Response

All APIs return standard response:

```json
{ "code": 0, "message": "success", "data": {} }
```

Errors return non-zero `code` and safe message.

## API Matrix

| API                                                      | Method | Permission                                            | Request Body                                                                                  | Response Data       | Required Fields  | Idempotency Key | Audit               |
| -------------------------------------------------------- | ------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------- | ---------------- | --------------- | ------------------- |
| `/api/arrears/followup/tasks`                            | GET    | owner, readonly_admin                                 | none                                                                                          | task list           | auth             | no              | read audit optional |
| `/api/arrears/followup/tasks?assigned_to=me`             | GET    | employee                                              | none                                                                                          | own task list       | auth             | no              | read audit optional |
| `/api/arrears/followup/tasks/:id/contacted`              | POST   | assigned employee, owner                              | `{ "note": "..." }`                                                                           | task                | note recommended | yes             | required            |
| `/api/arrears/followup/tasks/:id/promised`               | POST   | assigned employee, owner                              | `{ "next_promised_payment_date": "YYYY-MM-DD", "note": "...", "promised_amount_fils": 1000 }` | task                | date, note       | yes             | required            |
| `/api/arrears/followup/tasks/:id/paid-reported`          | POST   | assigned employee, owner                              | `{ "note": "...", "amount_fils": 1000, "payment_method": "cash" }`                            | task                | note             | yes             | required            |
| `/api/arrears/followup/tasks/:id/suggest-moved-out`      | POST   | assigned employee, owner                              | `{ "note": "..." }`                                                                           | task                | note             | yes             | required            |
| `/api/arrears/followup/tasks/:id/suggest-false-positive` | POST   | assigned employee, owner                              | `{ "note": "..." }`                                                                           | task                | note             | yes             | required            |
| `/api/arrears/followup/tasks/:id/needs-review`           | POST   | owner                                                 | `{ "reason": "..." }`                                                                         | task                | reason           | yes             | required            |
| `/api/arrears/followup/tasks/:id/close`                  | POST   | owner                                                 | `{ "close_reason": "..." }`                                                                   | task                | close_reason     | yes             | required            |
| `/api/arrears/followup/tasks/:id/void`                   | POST   | owner                                                 | `{ "reason": "..." }`                                                                         | task                | reason           | yes             | required            |
| `/api/arrears/followup/export/whatsapp`                  | GET    | employee own scope, owner all scope, readonly preview | query mode                                                                                    | text/export payload | auth             | no              | optional            |
| `/api/arrears/followup/customer-risk/:customer_code`     | GET    | owner, readonly_admin, assigned employee scoped       | none                                                                                          | risk summary        | customer_code    | no              | optional            |

## Error Behavior

- Missing auth: 401.
- Role/scope denied: 403.
- Missing required fields: 400.
- Invalid transition: 409.
- Idempotency replay: 200 with replay marker.
- Unexpected error: 500 without stack or filesystem path.

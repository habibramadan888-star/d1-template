# Readonly Admin Role Design

Role names:

- `admin_readonly`
- `readonly_admin`

Permissions:

| Capability                   | Result      |
| ---------------------------- | ----------- |
| View owner dashboard         | allowed     |
| View history                 | allowed     |
| View clients                 | allowed     |
| View analysis                | allowed     |
| Employee entry write         | denied      |
| Handover submit              | denied      |
| Void/delete                  | denied      |
| Settings update              | denied      |
| WiFi/settings write          | denied      |
| Production D1 write approval | not granted |

Authority model:

- Backend role/session claim remains the authority.
- Frontend hides or disables write controls for readonly admin, but backend also rejects write routes.
- Readonly admin does not change dashboard calculations, financial formulas, or business rules.

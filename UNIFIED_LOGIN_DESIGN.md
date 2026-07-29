# Unified Login Design

Date: 2026-05-27, Asia/Dubai

Scope: unified login design for internal QA. This design does not approve
production deploy, production migration, production D1 write, production
feature flags, dashboard authority switch, or commercial launch.

## Login Flow

1. User opens the unified entry: `/unified-login.html`.
2. User enters either employee ID + PIN, or leaves employee ID blank and enters
   owner/manager password.
3. Worker verifies credentials through `/auth/employee-login` or `/auth/login`.
4. Worker sets the session cookie and returns server-side session data.
5. Frontend calls `/api/me` after login.
6. Frontend routes by `/api/me.role`, not by user-entered role or a frontend
   tenant/property value.
7. Destination pages continue to use backend auth/session checks for protected
   API calls.

## Role Routing

| Role     | Destination         |
| -------- | ------------------- |
| employee | `/employee-v3.html` |
| staff    | `/employee-v3.html` |
| owner    | `/index.html`       |
| manager  | `/index.html`       |
| admin    | `/index.html`       |
| unknown  | Error / denied      |

## Security Rules

1. Frontend role is not authority.
2. Frontend `tenant_id` and `property_id` are not authority.
3. Backend auth/session claim decides permissions.
4. Unauthenticated access must become 401 or redirect to unified login.
5. Unauthorized access must become 403 or denied UI.
6. Employee/staff users route to the employee page and cannot use owner
   protected resources.
7. Owner/manager/admin users route to the owner/main SPA and cannot submit
   employee-only workflows unless explicitly granted.
8. Legacy CORPID fallback is warning-only and not final SaaS production
   authority.
9. Production remains `PRODUCTION_NO_GO` until migration, backup, rollback,
   deploy, feature flags, and cutover are separately approved.

## Compatibility

| Existing Path         | Treatment                                            |
| --------------------- | ---------------------------------------------------- |
| `/employee-v3.html`   | Preserved as the employee destination page.          |
| `/`                   | Preserved as owner/main SPA compatibility path.      |
| `/index.html`         | Preserved as explicit owner/main SPA destination.    |
| `/index-51.html`      | Preserved as versioned main SPA compatibility asset. |
| `/unified-login.html` | New preferred internal QA login portal.              |

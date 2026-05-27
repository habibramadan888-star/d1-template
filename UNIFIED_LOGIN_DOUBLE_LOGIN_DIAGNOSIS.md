# Unified Login Double-Login Diagnosis

Date: 2026-05-28

## Scope

Diagnosis for the post-unified-login double-login issue:

`/unified-login.html -> /index.html`

This task did not execute production migration, production D1 write, D1 export/import/execute, employee entry write, handover submit, void/delete, dashboard calculation change, or financial formula change.

## Findings

| Check                 | Finding                                                                                                                 | Result |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ |
| Unified login page    | Calls `/auth/login` or `/auth/employee-login`, then calls `/api/me` and routes by the server claim.                     | PASS   |
| `/auth/login`         | Creates a server session, returns a `Set-Cookie` session cookie, and returns role/user metadata.                        | PASS   |
| Cookie settings       | `Path=/`, `HttpOnly`, `Secure`, `SameSite=Strict`. Same Worker paths can reuse it; frontend JS cannot read it directly. | PASS   |
| `/api/me`             | Uses cookie or bearer token as backend authority.                                                                       | PASS   |
| Owner SPA startup     | Previously did not call `/api/me` on startup before showing the legacy login overlay.                                   | FAIL   |
| Employee page startup | Previously cleared local cached employee state and did not call `/api/me`; it forced the PIN fallback path.             | RISK   |

## Root Cause

The server session and cookie are created correctly by unified login. The double-login happens because the owner destination page (`index.html` / `index-51-main.js`) did not check `/api/me` on startup. It showed the legacy login overlay by default and only entered the app after the old password form was submitted again.

## Required Answers

| Question                                                                       | Answer                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Why does the owner need to log in twice?                                       | The owner SPA ignores the valid unified-login server session during startup and leaves the legacy login overlay visible.                                                                                   |
| Is the issue cookie/session not being written, or `index.html` not reading it? | The issue is `index.html` not reading `/api/me` on startup. Cookie settings are valid for same-origin route reuse.                                                                                         |
| Does employee have the same risk?                                              | Yes. `employee-v3.html` previously did not reuse `/api/me` on startup and would force the PIN fallback even after unified employee login.                                                                  |
| Minimum safe fix                                                               | On each role destination, call `/api/me` at startup. Enter the correct page only when `/api/me` returns an allowed role; otherwise keep legacy login fallback or redirect to the correct role destination. |

## Security Boundary

The frontend does not become authority. The only trusted source for route handoff is `/api/me`. Frontend role, localStorage role, tenant_id, and property_id are ignored for authorization.

## Production Status

Production cutover remains `PRODUCTION_NO_GO`.

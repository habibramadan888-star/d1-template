# Arrears Production Auth Session Impact Review

## Findings

| Question | Answer |
|---|---|
| Does `/auth/login` write `active_sessions`? | yes |
| Does owner login create a session row? | yes, via `createSession()` |
| Does employee login create a session row? | yes, via `createSession()` in `handleEmployeePinLogin()` |
| Can a session be cleared? | yes, `/api/logout` revokes the session by setting `active_sessions.revoked=1` |
| Does logout create another production write? | yes, it updates `active_sessions` |
| Does smoke need session cleanup? | yes, if harness login is used |
| Is auth session creation a production write? | yes |
| Must future smoke approval include auth session write approval? | yes |

## Conclusion

`AUTH_SESSION_WRITE_APPROVAL_REQUIRED`

Future production smoke approval must explicitly approve:

1. Owner auth session creation.
2. Employee auth session creation.
3. Optional logout/session revocation writes after smoke.
4. No printing of password/token/cookie/Set-Cookie.


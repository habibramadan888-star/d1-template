# Unified Login Browser Password Manager Result

| Item                               | Result                                                                |
| ---------------------------------- | --------------------------------------------------------------------- |
| Plaintext password saved by system | no                                                                    |
| Password saved in localStorage     | no                                                                    |
| Password saved in sessionStorage   | no                                                                    |
| Autocomplete configured            | yes                                                                   |
| Owner no-account support           | hidden stable username `homelink-owner` for browser password managers |
| Employee login affected            | no                                                                    |

Implementation:

- Visible username field keeps `autocomplete="username"`.
- Password field keeps `autocomplete="current-password"`.
- A hidden username field gives owner/password-only login a stable account identifier for browser password managers.
- `rememberAccount` stores only username/account id, never password or PIN.
- Clear session clears auth/session caches and leaves password empty.

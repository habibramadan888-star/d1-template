# Readonly Admin Portal Result

Date: 2026-05-29, Asia/Dubai

| Check                   | Result                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Admin door present      | Yes                                                                                        |
| Username default        | `admin`                                                                                    |
| Role accepted           | `readonly_admin` / `admin_readonly`                                                        |
| Destination             | `/admin`                                                                                   |
| Owner data visibility   | Yes, via owner app read-only mode                                                          |
| `canWrite` expected     | false                                                                                      |
| Backend write guard     | Existing backend write endpoints require write-capable manager role; readonly admin denied |
| Frontend write controls | Hidden/disabled by readonly admin guard                                                    |
| Production D1 write     | No                                                                                         |

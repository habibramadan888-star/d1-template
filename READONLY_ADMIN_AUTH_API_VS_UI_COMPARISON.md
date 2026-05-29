# Readonly Admin Auth API vs Unified Login UI Comparison

## Before Fix

| Check                      | API Direct                   | Unified Login UI        | Result                             |
| -------------------------- | ---------------------------- | ----------------------- | ---------------------------------- |
| Request URL                | `/auth/login`                | `/auth/employee-login`  | mismatch                           |
| Request method             | `POST`                       | `POST`                  | same                               |
| Payload field names        | `password`                   | `employee_id`, `pin`    | mismatch                           |
| Username sent              | no                           | `admin`                 | UI incorrectly used employee field |
| Password printed           | no                           | no                      | pass                               |
| Response status            | `200`                        | `401`                   | mismatch                           |
| Response role              | `readonly_admin`             | none                    | mismatch                           |
| Frontend displayed message | not applicable               | username/password error | caused by wrong endpoint           |
| Redirect target            | `index.html` after `/api/me` | none                    | UI blocked before routing          |

The UI did not fail because `readonly_admin` was an unknown role. The role is already present in the unified login owner-role set. The failure happened earlier: username `admin` selected the employee PIN endpoint.

## After Fix

| Check                      | API Direct                   | Unified Login UI                                             | Result |
| -------------------------- | ---------------------------- | ------------------------------------------------------------ | ------ |
| Request URL                | `/auth/login`                | `/auth/login`                                                | fixed  |
| Request method             | `POST`                       | `POST`                                                       | same   |
| Payload field names        | `password`                   | `password`                                                   | fixed  |
| Username sent              | no                           | owner-side login identifier used only for endpoint selection | fixed  |
| Password printed           | no                           | no                                                           | pass   |
| Response status            | `200`                        | `200`                                                        | fixed  |
| Response role              | `readonly_admin`             | `readonly_admin`                                             | fixed  |
| Frontend displayed message | no error                     | no username/password error                                   | fixed  |
| Redirect target            | `index.html` after `/api/me` | `index.html` after `/api/me`                                 | fixed  |

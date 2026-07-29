# Employee Header Name Display Fix Result

| Item                     | Result |
| ------------------------ | ------ |
| Removed label 当前员工   | yes    |
| Shows real user name     | yes    |
| Shows staff role         | no     |
| Name centered            | yes    |
| Permission logic changed | no     |

The employee header now renders only the resolved user name in the identity box. Resolution order remains: `display_name`, `displayName`, `name`, `username`, `employee_name`, `employee_id`, `userid`, `login_id`; role values such as `staff` and `employee` are filtered out.

# Arrears Follow-up Permission Matrix Final

Status: final permission design only

| Action                 | Employee / Staff           | Owner / Manager               | Readonly Admin   | Notes                                              |
| ---------------------- | -------------------------- | ----------------------------- | ---------------- | -------------------------------------------------- |
| View own tasks         | Yes                        | Yes                           | Yes              | Employee scope is `assigned_to = me`               |
| View all tasks         | No                         | Yes                           | Yes              | Readonly admin is read-only                        |
| Assign task            | No                         | Yes                           | No               | Backend must enforce                               |
| Mark contacted         | Own assigned only          | Yes                           | No               | Requires note recommended                          |
| Mark promised          | Own assigned only          | Yes                           | No               | Requires promise date and note                     |
| Mark paid reported     | Own assigned only          | Yes                           | No               | Does not mean matched payment                      |
| Suggest false positive | Own assigned only          | Yes                           | No               | Employee suggestion only                           |
| Suggest moved out      | Own assigned only          | Yes                           | No               | Employee suggestion only                           |
| Confirm false positive | No                         | Yes                           | No               | Requires close/review reason                       |
| Confirm moved out      | No                         | Yes                           | No               | Requires close/review reason                       |
| Close task             | No                         | Yes                           | No               | Requires close reason                              |
| Void task              | No                         | Yes                           | No               | Requires reason and audit                          |
| View risk score        | Own assigned customer only | Yes                           | Yes              | Employee sees only task context                    |
| Export WhatsApp        | Own assigned list only     | Yes                           | Yes preview only | Default export is staff short format               |
| Modify amount          | No                         | Owner can request review only | No               | Authority remains accounting backend               |
| Modify source data     | No                         | No direct mutation            | No               | Source corrections must use source domain workflow |
| View audit trail       | Own task events only       | Yes                           | Yes              | Sensitive fields redacted if needed                |

## Backend Enforcement

All write APIs must validate role and scope server-side. Frontend button hiding is not a security boundary.

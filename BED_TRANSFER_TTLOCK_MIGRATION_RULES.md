# Bed Transfer TTLock Migration Rules

| Rule | Required Behavior |
|---|---|
| Preserve old record | Old TTLock card/passcode/record is never deleted. |
| Mark old relationship | Old record may later be marked `transfer_out` or closed at transfer date. |
| Create/link new record | New bed must generate or wait for a new TTLock record. |
| Preserve original check-in | Old check-in date remains traceable. |
| Preserve old period | Old validity/month/period remains traceable. |
| New validity | New TTLock validity starts at transfer date or approved effective date. |
| Missing TTLock | Mark `ttlock_review_required`; do not fabricate data. |
| Owner visibility | Owner should later see old/new refs and validity dates. |

Not allowed:

- Deleting old TTLock records.
- Overwriting old check-in date.
- Treating the new bed as a new customer while losing the old chain.

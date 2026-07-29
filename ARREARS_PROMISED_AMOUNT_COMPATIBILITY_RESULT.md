# ARREARS_PROMISED_AMOUNT_COMPATIBILITY_RESULT

## Compatibility Decision

`promise_amount` / `promised_amount_fils` may continue to exist in backend/API compatibility contracts, but they are no longer part of the default owner or employee follow-up UI.

| Question                                       | Decision                   |
| ---------------------------------------------- | -------------------------- |
| Delete database fields                         | no                         |
| Delete API fields                              | no, preserve compatibility |
| Default owner UI displays promised amount      | no                         |
| Employee default form asks for promised amount | no                         |

## Rationale

The system already determines arrears amount from either the existing arrears record or the bed rent mapping. Asking employees to re-enter a promised amount duplicates work and adds operational noise.

If future accounting workflows require promised amount, it should be treated as an advanced/detail field, not a default follow-up field.

## Safety

No migration was created or run. No existing data was changed.

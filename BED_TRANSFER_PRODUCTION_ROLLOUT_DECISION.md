# Bed Transfer Production Rollout Decision

Decision: `DO_NOT_ENABLE_PRODUCTION_YET`

Production enablement requirements:

1. Current work is local/code/test/documentation only.
2. Any schema migration requires separate explicit approval.
3. Any production write smoke requires separate explicit approval.
4. Recommended production smoke, if later approved: one low-risk bed transfer only.
5. Do not enable for all employees before staging E2E passes.
6. Production cutover remains `PRODUCTION_NO_GO`.

Allowed later deploy scope, if approved:

- Employee Bed Transfer UI fields.
- Validation summary logic.
- State/data anchors.

Disallowed without separate approval:

- Production write.
- Write gate opening.
- Migration.
- Automatic real bed relationship updates.

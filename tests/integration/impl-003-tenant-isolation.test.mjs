import { describe, it } from "node:test";

describe("IMPL-003 Tenant and Property Isolation integration plan", () => {
  it(
    "filters employee reads by assigned property",
    { skip: "requires staging scoped accounts" },
    () => {}
  );

  it(
    "denies employee access to another property",
    { skip: "requires staging scoped accounts" },
    () => {}
  );

  it(
    "allows owner reads inside own tenant",
    { skip: "requires staging tenant fixtures" },
    () => {}
  );

  it(
    "denies owner reads from another tenant",
    { skip: "requires staging tenant fixtures" },
    () => {}
  );

  it(
    "ignores frontend-supplied tenant_id tampering",
    { skip: "requires staging auth claim harness" },
    () => {}
  );

  it(
    "returns 403 for unauthorized scoped writes",
    { skip: "requires staging write harness" },
    () => {}
  );
});

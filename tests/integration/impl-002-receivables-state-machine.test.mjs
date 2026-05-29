import { describe, it } from "node:test";

describe("IMPL-002 Receivables State Machine integration plan", () => {
  it(
    "transitions PENDING to PARTIAL",
    { skip: "requires staging receivables write harness" },
    () => {}
  );

  it(
    "transitions PARTIAL to PAID",
    { skip: "requires staging receivables write harness" },
    () => {}
  );

  it(
    "rejects invalid transitions",
    { skip: "requires staging receivables write harness" },
    () => {}
  );

  it(
    "writes ledger entries for every transition",
    { skip: "requires staging receivables ledger" },
    () => {}
  );

  it("allocates payments oldest-first", { skip: "requires staged due-date fixtures" }, () => {});

  it(
    "rolls back transition and ledger insert together",
    { skip: "requires failure injection harness" },
    () => {}
  );
});

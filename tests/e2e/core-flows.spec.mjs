import assert from "node:assert/strict";
import test from "node:test";
import {
  apiRequest,
  expectStandard,
  loginEmployee,
  loginOwner
} from "../helpers/api-test-utils.mjs";

test("core owner and employee flows use standard API responses", async () => {
  const stats = { total: 0, passed: 0 };
  async function step(name, fn) {
    stats.total += 1;
    await fn();
    stats.passed += 1;
    console.log(`PASS E2E ${name}`);
  }

  let ownerCookie = "";
  let employeeCookie = "";

  await step("owner login", async () => {
    ownerCookie = await loginOwner();
    assert.ok(ownerCookie.includes("__session="));
  });

  await step("GET /api/me", async () => {
    const payload = await expectStandard(await apiRequest("/api/me", { cookie: ownerCookie }), {
      label: "GET /api/me",
      status: 200,
      code: 0
    });
    assert.ok(payload.data?.userid, "current user payload should include userid");
  });

  await step("GET /api/dashboard/totals", async () => {
    const payload = await expectStandard(
      await apiRequest("/api/dashboard/totals", { cookie: ownerCookie }),
      {
        label: "GET /api/dashboard/totals",
        status: [200, 404]
      }
    );
    if (payload.code === 0) {
      assert.ok(payload.data?.data, "dashboard totals should include data");
      assert.ok(payload.data?.computation, "dashboard totals should include computation metadata");
    } else {
      assert.equal(payload.code, 1003, "disabled dashboard route should be a standard not_found");
    }
  });

  await step("POST /api/rent_config write", async () => {
    const payload = await expectStandard(
      await apiRequest("/api/rent_config", {
        method: "POST",
        cookie: ownerCookie,
        body: {
          config: {
            "e2e-room": 1234,
            "e2e-room-2": 1567
          }
        }
      }),
      { label: "POST /api/rent_config", status: 200, code: 0 }
    );
    assert.equal(payload.data?.success, true);
    assert.equal(payload.data?.count, 2);
  });

  await step("GET /api/rent_config verifies write", async () => {
    const payload = await expectStandard(
      await apiRequest("/api/rent_config", { cookie: ownerCookie }),
      { label: "GET /api/rent_config", status: 200, code: 0 }
    );
    assert.equal(payload.data?.config?.["e2e-room"], 1234);
  });

  await step("GET /api/receivables readonly", async () => {
    const payload = await expectStandard(
      await apiRequest("/api/receivables", { cookie: ownerCookie }),
      { label: "GET /api/receivables", status: [200, 404] }
    );
    assert.ok([0, 1003].includes(payload.code), "receivables route should be success or standard not_found");
  });

  await step("POST /api/customers write", async () => {
    const payload = await expectStandard(
      await apiRequest("/api/customers", {
        method: "POST",
        cookie: ownerCookie,
        body: {
          customers: [
            {
              name: "E2E Test Customer",
              phone: "+971500000000",
              note: "created by core-flows.spec.mjs"
            }
          ]
        }
      }),
      { label: "POST /api/customers", status: 200, code: 0 }
    );
    assert.equal(payload.data?.success, true);
    assert.equal(payload.data?.count, 1);
  });

  await step("employee write is forbidden", async () => {
    employeeCookie = await loginEmployee();
    const payload = await expectStandard(
      await apiRequest("/api/rent_config", {
        method: "POST",
        cookie: employeeCookie,
        body: { config: { "forbidden-room": 1 } }
      }),
      { label: "employee POST /api/rent_config", status: 403, code: 1002 }
    );
    assert.equal(payload.message, "forbidden");
  });

  console.log(`E2E_SUMMARY passed=${stats.passed} total=${stats.total}`);
});

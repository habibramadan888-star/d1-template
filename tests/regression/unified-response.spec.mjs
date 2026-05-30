import assert from "node:assert/strict";
import test from "node:test";
import {
  apiRequest,
  assertStandardEnvelope,
  expectStandard,
  loginEmployee,
  loginOwner
} from "../helpers/api-test-utils.mjs";

test("core authenticated API routes return StandardResponse envelopes", async () => {
  const ownerCookie = await loginOwner();
  const endpoints = [
    { path: "/api/me", status: [200], success: true },
    { path: "/api/rent_config", status: [200], success: true },
    { path: "/api/customers", status: [200], success: true },
    { path: "/api/history", status: [200], success: true },
    { path: "/api/receivables", status: [200, 404], success: "optional" },
    { path: "/api/dashboard/totals", status: [200, 404], success: "optional" }
  ];

  for (const endpoint of endpoints) {
    const payload = await expectStandard(
      await apiRequest(endpoint.path, { cookie: ownerCookie }),
      {
        label: `GET ${endpoint.path}`,
        status: endpoint.status
      }
    );
    if (endpoint.success === true) {
      assert.equal(payload.code, 0, `${endpoint.path} should be success`);
      assert.ok("data" in payload, `${endpoint.path} should include data`);
    } else {
      assert.ok([0, 1003].includes(payload.code), `${endpoint.path} should be success or not_found`);
    }
  }
});

test("error scenarios return StandardResponse error envelopes", async () => {
  const unauth = await expectStandard(await apiRequest("/api/me"), {
    label: "unauthenticated /api/me",
    status: 401,
    code: 1001
  });
  assert.equal(unauth.message, "unauthenticated");

  const invalidToken = await expectStandard(
    await apiRequest("/api/me", {
      headers: { Authorization: "Bearer invalid.local.jwt" }
    }),
    {
      label: "invalid token /api/me",
      status: 401,
      code: 1001
    }
  );
  assertStandardEnvelope(invalidToken, "invalid token response");

  const employeeCookie = await loginEmployee();
  const forbidden = await expectStandard(
    await apiRequest("/api/rent_config", {
      method: "POST",
      cookie: employeeCookie,
      body: { config: { regression: 1 } }
    }),
    {
      label: "employee forbidden write",
      status: 403,
      code: 1002
    }
  );
  assert.equal(forbidden.message, "forbidden");

  const ownerCookie = await loginOwner();
  const notFound = await expectStandard(
    await apiRequest("/api/not-a-real-route", { cookie: ownerCookie }),
    {
      label: "missing route",
      status: 404,
      code: 1003
    }
  );
  assert.equal(notFound.error, "not_found");
});

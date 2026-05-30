import assert from "node:assert/strict";
import test from "node:test";
import { ErrorCodes } from "../../dist/lib/constants/error-codes.js";
import { apiRequest, expectStandard, loginOwner } from "../helpers/api-test-utils.mjs";

test("central ErrorCodes values are stable", () => {
  assert.equal(ErrorCodes.BAD_REQUEST, 1000);
  assert.equal(ErrorCodes.UNAUTHORIZED, 1001);
  assert.equal(ErrorCodes.FORBIDDEN, 1002);
  assert.equal(ErrorCodes.NOT_FOUND, 1003);
  assert.equal(ErrorCodes.INTERNAL_SERVER, 1500);
});

test("runtime error responses use expected error codes", async () => {
  await expectStandard(await apiRequest("/api/me"), {
    label: "unauthenticated /api/me",
    status: 401,
    code: ErrorCodes.UNAUTHORIZED
  });

  const ownerCookie = await loginOwner();

  await expectStandard(await apiRequest("/api/not-found-for-error-code-test", { cookie: ownerCookie }), {
    label: "not found route",
    status: 404,
    code: ErrorCodes.NOT_FOUND
  });

  await expectStandard(
    await apiRequest("/api/customers", {
      method: "POST",
      cookie: ownerCookie,
      body: "{"
    }),
    {
      label: "invalid JSON write",
      status: 400,
      code: ErrorCodes.BAD_REQUEST
    }
  );
});

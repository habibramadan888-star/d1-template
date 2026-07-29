import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("deploy-worker/src/index.js", "utf8");

function functionBlock(name) {
  const marker = `function ${name}(`;
  const markerStart = source.indexOf(marker);
  assert.notEqual(markerStart, -1, name);
  const asyncStart = markerStart - "async ".length;
  const start = asyncStart >= 0
      && source.slice(asyncStart, markerStart) === "async "
    ? asyncStart
    : markerStart;
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== "") {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`FUNCTION_BLOCK_UNTERMINATED:${name}`);
}

function runtime(overrides = {}) {
  const calls = [];
  const dependencies = {
    readRouteClaim: async () => ({ role: "staff" }),
    redirectToRootEntry: (_request, portal) => ({
      kind: "redirect",
      portal,
    }),
    isStaffRoleValue: (role) => ["staff", "employee"].includes(role),
    fetchStaticAsset: async (_request, _env, path) => {
      calls.push({ kind: "asset", path });
      return new Response(path.endsWith(".html") ? "candidate-html" : "candidate-js", {
        status: 200,
        headers: {
          "Content-Type": path.endsWith(".html")
            ? "text/html; charset=utf-8"
            : "text/javascript; charset=utf-8",
        },
      });
    },
    ...overrides,
  };
  const factory = new Function(
    "readRouteClaim",
    "redirectToRootEntry",
    "isStaffRoleValue",
    "fetchStaticAsset",
    "Response",
    "Headers",
    `${functionBlock("employeeNextAssetPath")}
     ${functionBlock("handleEmployeeNextSidecarRoute")}
     return { employeeNextAssetPath, handleEmployeeNextSidecarRoute };`,
  );
  return {
    calls,
    ...factory(
      dependencies.readRouteClaim,
      dependencies.redirectToRootEntry,
      dependencies.isStaffRoleValue,
      dependencies.fetchStaticAsset,
      Response,
      Headers,
    ),
  };
}

function request(path, method = "GET") {
  return new Request(`https://homelink.invalid${path}`, { method });
}

test("employee-next route inventory is exact and collision free", () => {
  const sidecar = runtime();
  assert.equal(
    sidecar.employeeNextAssetPath("/employee-next"),
    "/employee-next/index.html",
  );
  assert.equal(
    sidecar.employeeNextAssetPath("/employee-next/"),
    "/employee-next/index.html",
  );
  assert.equal(
    sidecar.employeeNextAssetPath("/employee-next/index.html"),
    "/employee-next/index.html",
  );
  assert.equal(
    sidecar.employeeNextAssetPath("/employee-next/employee-next.js"),
    "/employee-next/employee-next.js",
  );
  assert.equal(sidecar.employeeNextAssetPath("/employee"), "");
  assert.equal(sidecar.employeeNextAssetPath("/employee-next-other"), "");
  assert.equal(sidecar.employeeNextAssetPath("/employee-next/unknown"), "");
});

test("unauthenticated and non-employee requests never receive candidate assets", async () => {
  const unauthenticated = runtime({ readRouteClaim: async () => null });
  const unauthenticatedResult = await unauthenticated.handleEmployeeNextSidecarRoute(
    request("/employee-next"),
    {},
    "/employee-next",
    "GET",
  );
  assert.deepEqual(unauthenticatedResult, {
    kind: "redirect",
    portal: "employee",
  });
  assert.equal(unauthenticated.calls.length, 0);

  for (const role of ["owner", "manager", "admin", "readonly_admin"]) {
    const denied = runtime({ readRouteClaim: async () => ({ role }) });
    const result = await denied.handleEmployeeNextSidecarRoute(
      request("/employee-next/employee-next.js"),
      {},
      "/employee-next/employee-next.js",
      "GET",
    );
    assert.equal(result.status, 404, role);
    assert.equal(denied.calls.length, 0, role);
  }
});

test("employee and staff GET or HEAD receive only no-store exact assets", async () => {
  for (const role of ["employee", "staff"]) {
    for (const method of ["GET", "HEAD"]) {
      const sidecar = runtime({ readRouteClaim: async () => ({ role }) });
      const response = await sidecar.handleEmployeeNextSidecarRoute(
        request("/employee-next/index.html", method),
        Object.freeze({}),
        "/employee-next/index.html",
        method,
      );
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control"), /no-store/u);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.match(
        response.headers.get("content-security-policy"),
        /default-src 'self'/u,
      );
      assert.equal(sidecar.calls.length, 1);
      assert.equal(sidecar.calls[0].path, "/employee-next/index.html");
      assert.equal(method === "HEAD" ? await response.text() : "", "");
    }
  }
});

test("unknown children and non-read methods fail closed without asset access", async () => {
  const sidecar = runtime();
  const unknown = await sidecar.handleEmployeeNextSidecarRoute(
    request("/employee-next/unknown"),
    {},
    "/employee-next/unknown",
    "GET",
  );
  assert.equal(unknown.status, 404);
  const post = await sidecar.handleEmployeeNextSidecarRoute(
    request("/employee-next", "POST"),
    {},
    "/employee-next",
    "POST",
  );
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
  assert.equal(sidecar.calls.length, 0);
});

test("sidecar interception leaves formal app route branches unchanged", () => {
  const appRoute = functionBlock("handleAppEntryRoute");
  assert.match(
    appRoute,
    /handleEmployeeNextSidecarRoute\(request,env,path,method\)/u,
  );
  assert.match(
    appRoute,
    /path !== "\/employee" && path !== "\/owner" && path !== "\/admin"/u,
  );
  assert.match(
    appRoute,
    /path === "\/employee" \? fetchStaticAsset\(request, env, "\/employee-v3"\)/u,
  );
  assert.match(
    appRoute,
    /path === "\/owner" \? fetchStaticAsset\(request, env, "\/index-51"\)/u,
  );
  assert.doesNotMatch(appRoute, /https?:\/\//u);
});

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const employeeNextRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const expectedFiles = [
  "index.html",
  "src/main.ts",
  "src/core/api-client.ts",
  "src/core/auth.ts",
  "src/core/draft-store.ts",
  "src/core/event-contract.ts",
  "src/core/event-registry.ts",
  "src/core/submit-entry.ts",
  "src/events/rent/index.ts",
  "src/events/arrears-payment/index.ts",
  "src/events/deposit-in/index.ts",
  "src/events/deposit-out/index.ts",
  "src/events/checkout/index.ts",
  "src/events/expense/index.ts",
  "src/events/bed-transfer/index.ts",
  "src/events/index.ts",
  "src/submit-flow.ts",
  "src/route.ts",
  "src/ui/shell.ts",
  "tests/architecture/architecture-boundary.spec.mjs",
  "tests/architecture/scaffold-smoke.spec.mjs",
  "tests/core/api-client.spec.mjs",
  "tests/core/auth.spec.mjs",
  "tests/core/draft-store.spec.mjs",
  "tests/core/event-contract.spec.mjs",
  "tests/core/event-registry.spec.mjs",
  "tests/core/submit-entry.spec.mjs",
  "tests/events/arrears-payment.spec.mjs",
  "tests/events/bed-transfer.spec.mjs",
  "tests/events/checkout.spec.mjs",
  "tests/events/deposit-in.spec.mjs",
  "tests/events/deposit-out.spec.mjs",
  "tests/events/expense.spec.mjs",
  "tests/events/register-seven-events.spec.mjs",
  "tests/events/rent.spec.mjs",
  "tests/integration/local-isolation-gates.spec.mjs",
  "tests/integration/submit-flow.spec.mjs",
  "tests/integration/route-build.spec.mjs",
  "tests/ui/shell.spec.mjs",
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(entryPath));
    } else {
      files.push(relative(employeeNextRoot, entryPath).split(sep).join("/"));
    }
  }

  return files.sort();
}

test("isolated employee-next scaffold contains only the task whitelist", async () => {
  assert.deepEqual(await listFiles(employeeNextRoot), [...expectedFiles].sort());
});

test("event placeholders remain independent and side-effect free", async () => {
  const eventFiles = expectedFiles.filter((path) => path.startsWith("src/events/"));
  const rentPath = "src/events/rent/index.ts";
  const arrearsPaymentPath = "src/events/arrears-payment/index.ts";
  const depositInPath = "src/events/deposit-in/index.ts";
  const depositOutPath = "src/events/deposit-out/index.ts";
  const checkoutPath = "src/events/checkout/index.ts";
  const implementedFiles = [
    rentPath,
    arrearsPaymentPath,
    depositInPath,
    depositOutPath,
    checkoutPath,
    "src/events/expense/index.ts",
    "src/events/bed-transfer/index.ts",
    "src/events/index.ts",
  ];
  const placeholderFiles = eventFiles.filter(
    (path) => !implementedFiles.includes(path),
  );
  const forbidden = /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest)\b|\/api\/|employee-v3|deploy-worker|src\/events\/\.\./;

  for (const path of eventFiles) {
    const source = await readFile(resolve(employeeNextRoot, path), "utf8");
    assert.doesNotMatch(source, forbidden, path);
    assert.doesNotMatch(source, /(?:from|import)\s+["'][^"']*events\//, path);
  }

  const rentSource = await readFile(resolve(employeeNextRoot, rentPath), "utf8");
  assert.match(rentSource, /from "\.\.\/\.\.\/core\/event-contract"/);
  assert.doesNotMatch(rentSource, /rentScaffold/);

  const arrearsPaymentSource = await readFile(
    resolve(employeeNextRoot, arrearsPaymentPath),
    "utf8",
  );
  assert.match(
    arrearsPaymentSource,
    /from "\.\.\/\.\.\/core\/event-contract"/,
  );
  assert.doesNotMatch(arrearsPaymentSource, /arrearsPaymentScaffold/);

  for (const path of placeholderFiles) {
    const source = await readFile(resolve(employeeNextRoot, path), "utf8");
    assert.match(source, /^export const \w+Scaffold = "[a-z-]+-scaffold";\r?\n$/u, path);
  }
});

test("scaffold does not implement runtime integration or legacy behavior", async () => {
  const files = await listFiles(employeeNextRoot);
  const forbidden = /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest)\b|\/api\/|employee-v3|canonical|finance|ttlock|void|correction|reversal/i;
  const authForbidden = /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest)\b|\/api\/|employee-v3|canonical|finance|ttlock|correction|reversal/i;
  const uiShellForbidden = /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest)\b|\/api\/|employee-v3|canonical|finance|ttlock|correction|reversal/i;
  const expenseForbidden = /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest)\b|\/api\/|employee-v3|canonical|finance[_ ]ledger|ttlock|void|correction|reversal/i;
  const bedTransferForbidden = /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest)\b|\/api\/|employee-v3|canonical|finance[_ ]ledger|ttlock[_ ]adapter|void|correction|reversal/i;
  const routeBuildForbidden = /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest)\b|\/api\/|employee-v3|canonical|finance|ttlock|correction|reversal/i;

  for (const path of files.filter((file) => /\.(?:html|ts)$/.test(file))) {
    const source = await readFile(resolve(employeeNextRoot, path), "utf8");
    const forbiddenForPath = path === "src/core/auth.ts"
      ? authForbidden
      : path === "src/ui/shell.ts"
        ? uiShellForbidden
        : path === "src/main.ts" || path === "src/route.ts"
          ? routeBuildForbidden
        : path === "src/events/expense/index.ts"
          ? expenseForbidden
          : path === "src/events/bed-transfer/index.ts"
            ? bedTransferForbidden
            : forbidden;
    assert.doesNotMatch(
      source,
      forbiddenForPath,
      path,
    );
  }
});

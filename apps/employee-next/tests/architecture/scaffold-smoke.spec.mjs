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
  "src/core/event-contract.ts",
  "src/core/event-registry.ts",
  "src/events/rent/index.ts",
  "src/events/arrears-payment/index.ts",
  "src/events/deposit-in/index.ts",
  "src/events/deposit-out/index.ts",
  "src/events/checkout/index.ts",
  "src/events/expense/index.ts",
  "src/events/bed-transfer/index.ts",
  "tests/architecture/architecture-boundary.spec.mjs",
  "tests/architecture/scaffold-smoke.spec.mjs",
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
  const forbidden = /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest)\b|\/api\/|employee-v3|deploy-worker|src\/events\/\.\./;

  for (const path of eventFiles) {
    const source = await readFile(resolve(employeeNextRoot, path), "utf8");
    assert.doesNotMatch(source, forbidden, path);
    assert.doesNotMatch(source, /(?:from|import)\s+["'][^"']*events\//, path);
  }
});

test("scaffold does not implement runtime integration or legacy behavior", async () => {
  const files = await listFiles(employeeNextRoot);
  const forbidden = /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest)\b|\/api\/|employee-v3|canonical|finance|ttlock|void|correction|reversal/i;

  for (const path of files.filter((file) => /\.(?:html|ts)$/.test(file))) {
    const source = await readFile(resolve(employeeNextRoot, path), "utf8");
    assert.doesNotMatch(source, forbidden, path);
  }
});

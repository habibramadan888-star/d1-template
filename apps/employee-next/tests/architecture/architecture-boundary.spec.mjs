import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import path from "node:path";

const employeeNextRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceRoot = resolve(employeeNextRoot, "src");
const expectedEvents = [
  "arrears-payment",
  "bed-transfer",
  "checkout",
  "deposit-in",
  "deposit-out",
  "expense",
  "rent",
];

function normalizePath(value) {
  return value.split(sep).join("/");
}

function maskComments(source) {
  let result = "";
  let state = "code";

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (state === "line-comment") {
      if (character === "\n") {
        state = "code";
        result += "\n";
      } else {
        result += " ";
      }
      continue;
    }

    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        result += "  ";
        index += 1;
        state = "code";
      } else {
        result += character === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (state === "single" || state === "double" || state === "template") {
      result += character;
      if (character === "\\") {
        result += next ?? "";
        index += 1;
      } else if (
        (state === "single" && character === "'")
        || (state === "double" && character === "\"")
        || (state === "template" && character === "`")
      ) {
        state = "code";
      }
      continue;
    }

    if (character === "/" && next === "/") {
      result += "  ";
      index += 1;
      state = "line-comment";
    } else if (character === "/" && next === "*") {
      result += "  ";
      index += 1;
      state = "block-comment";
    } else {
      result += character;
      if (character === "'") state = "single";
      else if (character === "\"") state = "double";
      else if (character === "`") state = "template";
    }
  }

  return result;
}

function maskCommentsAndStrings(source) {
  let result = "";
  let state = "code";

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (state === "line-comment") {
      if (character === "\n") {
        state = "code";
        result += "\n";
      } else {
        result += " ";
      }
      continue;
    }

    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        result += "  ";
        index += 1;
        state = "code";
      } else {
        result += character === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (state === "single" || state === "double" || state === "template") {
      if (character === "\\") {
        result += "  ";
        index += 1;
      } else if (
        (state === "single" && character === "'")
        || (state === "double" && character === "\"")
        || (state === "template" && character === "`")
      ) {
        result += " ";
        state = "code";
      } else {
        result += character === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (character === "/" && next === "/") {
      result += "  ";
      index += 1;
      state = "line-comment";
    } else if (character === "/" && next === "*") {
      result += "  ";
      index += 1;
      state = "block-comment";
    } else if (character === "'" || character === "\"" || character === "`") {
      result += " ";
      state = character === "'" ? "single" : character === "\"" ? "double" : "template";
    } else {
      result += character;
    }
  }

  return result;
}

function moduleSpecifiers(source) {
  const withoutComments = maskComments(source);
  const specifiers = [];
  const staticPattern = /\b(?:import\s+(?:(?:[\s\S]*?)\s+from\s+)?|export\s+(?:[\s\S]*?)\s+from\s+)["']([^"']+)["']/g;
  const dynamicPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;

  while ((match = staticPattern.exec(withoutComments))) specifiers.push(match[1]);
  while ((match = dynamicPattern.exec(withoutComments))) specifiers.push(match[1]);
  return [...new Set(specifiers)].sort();
}

function eventName(filePath) {
  const match = filePath.match(/^src\/events\/([^/]+)\//);
  return match?.[1] ?? "";
}

function resolveLocalImport(filePath, specifier, sources) {
  if (!specifier.startsWith(".")) return { error: "bare package import is not allowed" };
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(filePath), specifier));

  if (base === ".." || base.startsWith("../") || !base.startsWith("src/")) {
    return { error: `relative import escapes src: ${specifier}` };
  }

  const candidates = base.endsWith(".ts")
    ? [base]
    : [`${base}.ts`, `${base}/index.ts`];
  const resolved = candidates.find((candidate) => sources.has(candidate));
  return resolved ? { resolved } : { error: `unresolved local import: ${specifier}` };
}

function topLevelMutableDeclarations(source) {
  const executable = maskCommentsAndStrings(source);
  const locations = [];
  let depth = 0;

  for (let index = 0; index < executable.length; index += 1) {
    const character = executable[index];
    if (character === "{") depth += 1;
    else if (character === "}") depth = Math.max(0, depth - 1);
    else if (depth === 0) {
      const match = executable.slice(index).match(/^(?:let|var)\b/);
      if (match) {
        locations.push(match[0]);
        index += match[0].length - 1;
      }
    }
  }

  return locations;
}

function directCapabilities(source) {
  const executable = maskCommentsAndStrings(source);
  const rules = [
    ["fetch", /\bfetch\s*\(/],
    ["localStorage", /\blocalStorage\b/],
    ["sessionStorage", /\bsessionStorage\b/],
    ["XMLHttpRequest", /\bXMLHttpRequest\b/],
    ["WebSocket", /\bWebSocket\b/],
    ["EventSource", /\bEventSource\b/],
    ["navigator.sendBeacon", /\bnavigator\s*\.\s*sendBeacon\s*\(/],
  ];
  return rules.filter(([, pattern]) => pattern.test(executable)).map(([name]) => name);
}

function canonicalCycle(cycle) {
  const body = cycle.slice(0, -1);
  const rotations = body.map((_, index) => {
    const rotated = [...body.slice(index), ...body.slice(0, index)];
    return [...rotated, rotated[0]].join(" -> ");
  });
  return rotations.sort()[0];
}

function dependencyCycles(graph) {
  const cycles = new Set();
  const state = new Map();
  const stack = [];

  function visit(node) {
    state.set(node, "visiting");
    stack.push(node);
    for (const dependency of [...(graph.get(node) ?? [])].sort()) {
      if (state.get(dependency) === "visiting") {
        const start = stack.indexOf(dependency);
        cycles.add(canonicalCycle([...stack.slice(start), dependency]));
      } else if (!state.has(dependency)) {
        visit(dependency);
      }
    }
    stack.pop();
    state.set(node, "visited");
  }

  for (const node of [...graph.keys()].sort()) {
    if (!state.has(node)) visit(node);
  }
  return [...cycles].sort();
}

function analyzeArchitecture({ sources, eventDirectories }) {
  const violations = [];
  const graph = new Map([...sources.keys()].sort().map((file) => [file, []]));
  const actualEvents = [...eventDirectories].sort();

  if (JSON.stringify(actualEvents) !== JSON.stringify(expectedEvents)) {
    violations.push(`[ARCH001] src/events: expected ${expectedEvents.join(",")}; actual ${actualEvents.join(",")}`);
  }

  for (const filePath of [...sources.keys()].sort()) {
    const source = sources.get(filePath);
    const sourceEvent = eventName(filePath);

    if (sourceEvent) {
      for (const capability of directCapabilities(source)) {
        violations.push(`[ARCH004] ${filePath}: direct ${capability} capability is forbidden`);
      }
      for (const declaration of topLevelMutableDeclarations(source)) {
        violations.push(`[ARCH006] ${filePath}: module-level ${declaration} is forbidden`);
      }
    }

    for (const specifier of moduleSpecifiers(source)) {
      const resolution = resolveLocalImport(filePath, specifier, sources);
      if (resolution.error) {
        violations.push(`[ARCH003] ${filePath}: ${resolution.error}`);
        continue;
      }

      const target = resolution.resolved;
      graph.get(filePath).push(target);
      const targetEvent = eventName(target);
      if (sourceEvent && targetEvent && sourceEvent !== targetEvent) {
        violations.push(`[ARCH002] ${filePath}: cross-event import to ${target}`);
      }
      if (sourceEvent && target === "src/core/api-client.ts") {
        violations.push(`[ARCH004] ${filePath}: direct core/api-client import is forbidden`);
      }
    }
  }

  for (const cycle of dependencyCycles(graph)) {
    violations.push(`[ARCH005] ${cycle.split(" -> ")[0]}: circular dependency ${cycle}`);
  }

  return [...violations].sort();
}

async function loadActualSources() {
  const sources = new Map();
  const eventDirectories = (await readdir(resolve(sourceRoot, "events"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(entryPath);
      else if (entry.name.endsWith(".ts")) {
        sources.set(normalizePath(relative(employeeNextRoot, entryPath)), await readFile(entryPath, "utf8"));
      }
    }
  }

  await walk(sourceRoot);
  return { sources, eventDirectories };
}

function legalFixture() {
  const sources = new Map([
    ["src/main.ts", "export const main = true;"],
    ["src/core/event-contract.ts", "export const contract = true;"],
    ["src/core/event-registry.ts", "export const registry = true;"],
    ["src/core/api-client.ts", "export const apiClient = true;"],
  ]);
  for (const event of expectedEvents) {
    sources.set(
      `src/events/${event}/index.ts`,
      `import { contract } from "../../core/event-contract";
       // fetch and localStorage are documentation words only.
       export function placeholder() { let local = contract; return "fetch localStorage " + local; }`,
    );
  }
  return { sources, eventDirectories: [...expectedEvents] };
}

function withSource(fixture, filePath, source) {
  return {
    sources: new Map([...fixture.sources, [filePath, source]]),
    eventDirectories: [...fixture.eventDirectories],
  };
}

const negativeFixtures = [
  ["cross-event static import", (fixture) => withSource(fixture, "src/events/rent/index.ts", 'import "../expense/index";'), "ARCH002"],
  ["cross-event dynamic import", (fixture) => withSource(fixture, "src/events/deposit-in/index.ts", 'import("../deposit-out/index");'), "ARCH002"],
  ["source boundary escape", (fixture) => withSource(fixture, "src/events/rent/index.ts", 'import "../../../outside";'), "ARCH003"],
  ["direct api-client import", (fixture) => withSource(fixture, "src/events/rent/index.ts", 'import "../../core/api-client";'), "ARCH004"],
  ["direct fetch", (fixture) => withSource(fixture, "src/events/rent/index.ts", 'export const result = fetch("/example");'), "ARCH004"],
  ["direct localStorage", (fixture) => withSource(fixture, "src/events/rent/index.ts", 'export const result = localStorage.getItem("x");'), "ARCH004"],
  ["circular dependency", (fixture) => ({
    sources: new Map([
      ...fixture.sources,
      ["src/core/a.ts", 'import "./b";'],
      ["src/core/b.ts", 'import "./a";'],
    ]),
    eventDirectories: [...fixture.eventDirectories],
  }), "ARCH005"],
  ["module-level mutable state", (fixture) => withSource(fixture, "src/events/rent/index.ts", "let shared = 0; export { shared };"), "ARCH006"],
  ["unresolved local import", (fixture) => withSource(fixture, "src/events/rent/index.ts", 'import "./missing";'), "ARCH003"],
  ["unknown eighth event", (fixture) => ({
    sources: new Map([...fixture.sources, ["src/events/other/index.ts", "export const other = true;"]]),
    eventDirectories: [...fixture.eventDirectories, "other"],
  }), "ARCH001"],
];

test("architecture guard rejects all in-memory violations", () => {
  for (const [name, createFixture, expectedRule] of negativeFixtures) {
    const violations = analyzeArchitecture(createFixture(legalFixture()));
    assert.ok(violations.some((violation) => violation.includes(`[${expectedRule}]`)), `${name}: ${violations.join("; ")}`);
  }
});

test("architecture guard accepts legal in-memory source without false positives", () => {
  assert.deepEqual(analyzeArchitecture(legalFixture()), []);
});

test("architecture guard scans the actual employee-next source tree", async () => {
  assert.deepEqual(analyzeArchitecture(await loadActualSources()), []);
});

test("architecture diagnostics are deterministic and sorted", () => {
  const fixture = negativeFixtures[0][1](legalFixture());
  const first = analyzeArchitecture(fixture);
  const second = analyzeArchitecture(fixture);
  assert.deepEqual(first, second);
  assert.deepEqual(first, [...first].sort());
  assert.ok(first.every((violation) => /^\[ARCH00[1-6]\] [^:]+: .+/.test(violation)));
});

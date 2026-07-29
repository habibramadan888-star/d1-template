import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gitFile = await readFile(resolve(repositoryRoot, ".git"), "utf8");
const gitDirectory = gitFile.trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(
  resolve(sourceRepositoryRoot, "package.json"),
);
const esbuild = requireFromRepository("esbuild");
const outputDirectory = resolve(
  repositoryRoot,
  "deploy-worker",
  "public",
  "employee-next",
);
const htmlPath = resolve(outputDirectory, "index.html");
const scriptPath = resolve(outputDirectory, "employee-next.js");
const temporaryHtmlPath = resolve(outputDirectory, ".index.html.tmp");
const temporaryScriptPath = resolve(outputDirectory, ".employee-next.js.tmp");

const html = `<!doctype html>
<html lang="en" data-employee-next-runtime="production" data-session-path="/api/me" data-submit-path="/api/employee/entry">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="referrer" content="same-origin">
    <title>Employee Next</title>
  </head>
  <body>
    <main id="employee-next-root" data-route="/employee-next" aria-label="Employee Next">
      Employee Next is restoring the authenticated session.
    </main>
    <script type="module" src="/employee-next/employee-next.js"></script>
  </body>
</html>
`;

const entrySource = `
import {
  createEmployeeNextSidecarAdapters,
  startEmployeeNextSidecarRoute,
} from "./apps/employee-next/src/main.ts";

const root = document.querySelector("#employee-next-root");
const sessionPath = document.documentElement.dataset.sessionPath;
const submitPath = document.documentElement.dataset.submitPath;

if (!(root instanceof HTMLElement) || !sessionPath || !submitPath) {
  throw new Error("EMPLOYEE_NEXT_BOOTSTRAP_INVALID");
}

const requestPort = Object.freeze({
  async request(path, init) {
    const response = await globalThis.fetch(path, init);
    return Object.freeze({
      status: response.status,
      json: async () => response.json(),
    });
  },
});

const adapters = createEmployeeNextSidecarAdapters({
  requestPort,
  sessionPath,
  submitPath,
});
startEmployeeNextSidecarRoute(root, adapters, {
  entryContexts: adapters.entryContexts,
});
`;

const build = await esbuild.build({
  bundle: true,
  charset: "utf8",
  format: "esm",
  legalComments: "none",
  minify: true,
  platform: "browser",
  sourcemap: false,
  stdin: {
    contents: entrySource,
    loader: "ts",
    resolveDir: repositoryRoot,
    sourcefile: "employee-next-production-entry.ts",
  },
  target: "es2022",
  treeShaking: true,
  write: false,
});

if (build.outputFiles.length !== 1) {
  throw new Error("EMPLOYEE_NEXT_BUILD_OUTPUT_INVALID");
}

await mkdir(outputDirectory, { recursive: true });
try {
  await writeFile(temporaryHtmlPath, html, "utf8");
  await writeFile(temporaryScriptPath, build.outputFiles[0].contents);
  await rename(temporaryHtmlPath, htmlPath);
  await rename(temporaryScriptPath, scriptPath);
} catch (error) {
  await rm(temporaryHtmlPath, { force: true });
  await rm(temporaryScriptPath, { force: true });
  throw error;
}

console.log(JSON.stringify({
  html: "deploy-worker/public/employee-next/index.html",
  html_bytes: Buffer.byteLength(html),
  script: "deploy-worker/public/employee-next/employee-next.js",
  script_bytes: build.outputFiles[0].contents.length,
}));

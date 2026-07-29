const fs = require("node:fs");
const path = require("node:path");

const scriptDir = __dirname;
const rootDir = path.resolve(scriptDir, "..");
const routeSourceFiles = [
  path.join(rootDir, "deploy-worker", "src", "index.js"),
  path.join(rootDir, "deploy-worker", "src", "index.embedded.js")
];

const endpoints = [
  {
    path: "/api/auth/login",
    method: "POST",
    aliases: ["/auth/login"],
    expectedStatus: [200, 400, 401]
  },
  {
    path: "/api/auth/logout",
    method: "POST",
    aliases: ["/auth/logout"],
    expectedStatus: [200, 401]
  },
  { path: "/api/properties", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/entries", method: "GET", expectedStatus: [200, 401] },
  {
    path: "/api/entries?limit=10",
    method: "GET",
    sourcePath: "/api/entries",
    expectedStatus: [200, 401]
  },
  { path: "/api/payments", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/customers", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/dashboard", method: "GET", expectedStatus: [200, 401] },
  {
    path: "/api/dashboard/totals",
    method: "GET",
    candidateFile: "deploy-worker/src/handlers/dashboard-totals.js",
    expectedStatus: [200, 401]
  },
  { path: "/api/arrears", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/history", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/owner/dashboard", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/owner/properties", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/owner/totals", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/owner/history", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/owner/arrears", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/owner/reports", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/admin/dashboard", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/admin/entries", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/admin/totals", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/admin/history", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/admin/audit", method: "GET", expectedStatus: [200, 401] },
  { path: "/api/health", method: "GET", aliases: ["/api/me"], expectedStatus: [200, 401] },
  { path: "/api/health/db", method: "GET", expectedStatus: [200] },
  { path: "/api/metrics/errors", method: "GET", expectedStatus: [200, 404] }
];

function readSources() {
  return routeSourceFiles
    .filter((file) => fs.existsSync(file))
    .map((file) => ({
      file,
      text: fs.readFileSync(file, "utf8")
    }));
}

function containsRoute(text, route) {
  const clean = route.split("?")[0];
  return (
    text.includes(`path === "${clean}"`) ||
    text.includes(`path==="${clean}"`) ||
    text.includes(`path === '${clean}'`) ||
    text.includes(`path==='${clean}'`)
  );
}

function sourceStatus(endpoint, sources) {
  const sourcePath = endpoint.sourcePath || endpoint.path;
  const exact = sources.find((source) => containsRoute(source.text, sourcePath));
  if (exact) {
    return {
      status: "SOURCE_WIRED",
      detail: path.relative(rootDir, exact.file)
    };
  }

  for (const alias of endpoint.aliases || []) {
    const matched = sources.find((source) => containsRoute(source.text, alias));
    if (matched) {
      return {
        status: "SOURCE_ALIAS",
        detail: `${alias} in ${path.relative(rootDir, matched.file)}`
      };
    }
  }

  if (endpoint.candidateFile && fs.existsSync(path.join(rootDir, endpoint.candidateFile))) {
    return {
      status: "CANDIDATE_NOT_ROUTED",
      detail: endpoint.candidateFile
    };
  }

  return { status: "NOT_WIRED", detail: "no source route match" };
}

async function liveStatus(endpoint, baseUrl) {
  if (!baseUrl) {
    return { status: "NOT_RUN", detail: "set LOCAL_STAGING_BASE_URL to run live checks" };
  }

  const url = new URL(endpoint.path, baseUrl);
  const options = {
    method: endpoint.method,
    redirect: "manual",
    headers: { "content-type": "application/json" }
  };

  if (endpoint.method !== "GET") {
    options.body = JSON.stringify({});
  }

  try {
    const response = await fetch(url, options);
    const accepted = endpoint.expectedStatus.includes(response.status);
    return {
      status: accepted ? "LIVE_EXPECTED" : "LIVE_UNEXPECTED",
      detail: `HTTP ${response.status}`
    };
  } catch (error) {
    return { status: "LIVE_ERROR", detail: error.message };
  }
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = row[key];
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function printRow(row) {
  console.log(
    `${row.method.padEnd(4)} ${row.path.padEnd(30)} source=${row.sourceStatus.padEnd(20)} live=${row.liveStatus.padEnd(14)} ${row.detail}`
  );
}

async function main() {
  const sources = readSources();
  const baseUrl = process.env.LOCAL_STAGING_BASE_URL || process.env.STAGING_BASE_URL || "";

  console.log("Verifying staging endpoint inventory");
  console.log(`Endpoints: ${endpoints.length}`);
  console.log(`Live base URL: ${baseUrl || "(not provided; source scan only)"}`);
  console.log("");

  const rows = [];
  for (const endpoint of endpoints) {
    const source = sourceStatus(endpoint, sources);
    const live = await liveStatus(endpoint, baseUrl);
    const row = {
      method: endpoint.method,
      path: endpoint.path,
      sourceStatus: source.status,
      liveStatus: live.status,
      detail: `${source.detail}; ${live.detail}`
    };
    rows.push(row);
    printRow(row);
  }

  console.log("");
  console.log("Source status summary:");
  for (const [status, count] of Object.entries(countBy(rows, "sourceStatus"))) {
    console.log(`  ${status.padEnd(22)} ${count}`);
  }

  console.log("");
  console.log("Live status summary:");
  for (const [status, count] of Object.entries(countBy(rows, "liveStatus"))) {
    console.log(`  ${status.padEnd(22)} ${count}`);
  }

  const sourceReady = rows.filter((row) =>
    ["SOURCE_WIRED", "SOURCE_ALIAS", "CANDIDATE_NOT_ROUTED"].includes(row.sourceStatus)
  ).length;
  console.log("");
  console.log(`Source inventory coverage: ${sourceReady}/${rows.length}`);

  if (!baseUrl) {
    console.log(
      "Live HTTP verification skipped. Start the Worker and set LOCAL_STAGING_BASE_URL to enable it."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

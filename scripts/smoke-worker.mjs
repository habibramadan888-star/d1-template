const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8793";

const checks = [
  { name: "employee page", path: "/employee-v3.html", expect: 200 },
  { name: "owner page", path: "/index-51.html", expect: 200 },
  { name: "unauthenticated api", path: "/api/me", expect: 401 }
];

const results = [];

for (const check of checks) {
  const url = new URL(check.path, baseUrl).toString();
  try {
    const res = await fetch(url, { redirect: "follow" });
    results.push({
      name: check.name,
      url,
      status: res.status,
      pass: res.status === check.expect
    });
  } catch (error) {
    results.push({
      name: check.name,
      url,
      status: "ERR",
      pass: false,
      error: error?.message || String(error)
    });
  }
}

for (const result of results) {
  const status = result.pass ? "PASS" : "FAIL";
  console.log(`${status} ${result.name} ${result.status} ${result.url}`);
  if (result.error) console.log(`  ${result.error}`);
}

if (results.some((result) => !result.pass)) process.exit(1);

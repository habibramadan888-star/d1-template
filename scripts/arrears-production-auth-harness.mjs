import fs from "node:fs";
import path from "node:path";

const AUTH_FILE = path.resolve(".tmp/arrears-smoke-auth/production-auth.local.env");
const DEFAULT_BASE_URL = "https://homelink-finance.habibramadan888.workers.dev";
const BASE_URL = (process.env.ARREARS_AUTH_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

function parseArgs(argv) {
  return {
    checkConfig: argv.includes("--check-config"),
    runAuthCheck: argv.includes("--run-auth-check")
  };
}

function parseLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, values: {} };
  const values = {};
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return { exists: true, values };
}

function hasValue(values, key) {
  return typeof values[key] === "string" && values[key].trim().length > 0;
}

function summarizeConfig(values, exists) {
  const employeePasswordPresent = hasValue(values, "EMPLOYEE_PASSWORD") || hasValue(values, "EMPLOYEE_PIN");
  return {
    auth_file_exists: exists,
    owner_login_id_present: hasValue(values, "OWNER_LOGIN_ID"),
    owner_password_present: hasValue(values, "OWNER_PASSWORD"),
    employee_login_id_present: hasValue(values, "EMPLOYEE_LOGIN_ID"),
    employee_password_present: employeePasswordPresent,
    employee_name_present: hasValue(values, "EMPLOYEE_NAME"),
    password_printed: "no",
    token_printed: "no",
    cookie_printed: "no"
  };
}

function assertConfig(values, exists) {
  const summary = summarizeConfig(values, exists);
  const ready =
    summary.auth_file_exists &&
    summary.owner_password_present &&
    summary.employee_login_id_present &&
    summary.employee_password_present;
  return { ready, summary };
}

function safeLog(label, value) {
  console.log(`${label}: ${value}`);
}

function collectCookie(response) {
  const setCookie =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return setCookie.map((value) => value.split(";")[0]).join("; ");
}

async function requestJson(pathname, options = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

function roleFromMe(body) {
  const payload = body?.data || body || {};
  return String(payload.role || "").toLowerCase();
}

async function loginOwner(values) {
  const login = await requestJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({ password: values.OWNER_PASSWORD })
  });
  const cookie = collectCookie(login.response);
  if (login.response.status !== 200 || !cookie) {
    return { usable: false, roleMatched: false, status: login.response.status };
  }
  const me = await requestJson("/api/me", {
    method: "GET",
    headers: { Cookie: cookie }
  });
  const role = roleFromMe(me.body);
  return {
    usable: me.response.status === 200,
    roleMatched: ["owner", "manager", "admin"].includes(role),
    status: me.response.status
  };
}

async function loginEmployee(values) {
  const password = values.EMPLOYEE_PASSWORD || values.EMPLOYEE_PIN;
  const login = await requestJson("/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({
      employee_id: values.EMPLOYEE_LOGIN_ID,
      pin: password,
      password
    })
  });
  const cookie = collectCookie(login.response);
  if (login.response.status !== 200 || !cookie) {
    return { usable: false, roleMatched: false, status: login.response.status };
  }
  const me = await requestJson("/api/me", {
    method: "GET",
    headers: { Cookie: cookie }
  });
  const role = roleFromMe(me.body);
  return {
    usable: me.response.status === 200,
    roleMatched: ["employee", "staff"].includes(role),
    status: me.response.status
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { exists, values } = parseLocalEnv(AUTH_FILE);
  const { ready, summary } = assertConfig(values, exists);

  if (args.checkConfig) {
    console.log(JSON.stringify({ mode: "check-config", ready, ...summary }, null, 2));
    return 0;
  }

  if (!args.runAuthCheck) {
    safeLog("mode", "no-op");
    safeLog("next", "run with --check-config or --run-auth-check");
    safeLog("password printed", "no");
    safeLog("token printed", "no");
    safeLog("cookie printed", "no");
    return 0;
  }

  if (!ready) {
    console.log(JSON.stringify({ mode: "run-auth-check", ready, ...summary }, null, 2));
    return 2;
  }

  const owner = await loginOwner(values);
  const employee = await loginEmployee(values);
  console.log(
    JSON.stringify(
      {
        mode: "run-auth-check",
        owner_auth_usable: owner.usable ? "yes" : "no",
        owner_role_matched: owner.roleMatched ? "yes" : "no",
        owner_status: owner.status,
        employee_auth_usable: employee.usable ? "yes" : "no",
        employee_role_matched: employee.roleMatched ? "yes" : "no",
        employee_status: employee.status,
        cookie_value: "[REDACTED]",
        set_cookie_value: "[REDACTED]",
        password_printed: "no",
        token_printed: "no",
        cookie_printed: "no",
        business_write_executed: "no",
        owner_directive_create_called: "no",
        employee_followup_called: "no"
      },
      null,
      2
    )
  );
  return owner.usable && owner.roleMatched && employee.usable && employee.roleMatched ? 0 : 1;
}

const exitCode = await main();
process.exitCode = exitCode;

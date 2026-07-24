export const EMPLOYEE_API_METHODS = Object.freeze([
  "GET",
  "POST",
] as const);

export type EmployeeApiMethod = (typeof EMPLOYEE_API_METHODS)[number];
export type EmployeeApiPath = string;

export type EmployeeApiJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly EmployeeApiJsonValue[]
  | Readonly<{ [key: string]: EmployeeApiJsonValue }>;

export type EmployeeApiHeaders = Readonly<Record<string, string>>;

export type EmployeeApiRequest =
  | Readonly<{
    method: "GET";
    path: EmployeeApiPath;
    headers?: EmployeeApiHeaders;
    body?: never;
  }>
  | Readonly<{
    method: "POST";
    path: EmployeeApiPath;
    headers?: EmployeeApiHeaders;
    body?: EmployeeApiJsonValue;
  }>;

export interface EmployeeApiResponse {
  readonly status: number;
  readonly headers?: EmployeeApiHeaders;
  readonly body?: EmployeeApiJsonValue;
}

export interface EmployeeApiTransport {
  request(request: EmployeeApiRequest): Promise<unknown>;
}

export const EMPLOYEE_API_CLIENT_ERROR_CODES = Object.freeze([
  "INVALID_TRANSPORT",
  "INVALID_METHOD",
  "INVALID_PATH",
  "INVALID_HEADERS",
  "INVALID_BODY",
  "INVALID_REQUEST",
  "INVALID_RESPONSE",
  "TRANSPORT_FAILED",
  "HTTP_ERROR_STATUS",
  "UNSAFE_RESPONSE_ECHO",
] as const);

export type EmployeeApiClientErrorCode =
  (typeof EMPLOYEE_API_CLIENT_ERROR_CODES)[number];

export type EmployeeApiClientResult =
  | Readonly<{ ok: true; response: EmployeeApiResponse }>
  | Readonly<{ ok: false; errorCode: EmployeeApiClientErrorCode }>;

export interface EmployeeApiClient {
  request(request: EmployeeApiRequest): Promise<EmployeeApiClientResult>;
}

type JsonValidation = "VALID" | "INVALID";

export function isEmployeeApiMethod(
  value: unknown,
): value is EmployeeApiMethod {
  return (
    typeof value === "string"
    && EMPLOYEE_API_METHODS.some((method) => method === value)
  );
}

export function isEmployeeApiPath(value: unknown): value is EmployeeApiPath {
  return (
    typeof value === "string"
    && value.startsWith("/")
    && !value.startsWith("//")
    && !value.includes("..")
    && !/[\s\u0000-\u001f\u007f]/u.test(value)
  );
}

function isPlainObject(
  value: object,
): value is Readonly<Record<string, unknown>> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateJson(
  value: unknown,
  ancestors: WeakSet<object>,
): JsonValidation {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return "VALID";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? "VALID" : "INVALID";
  }
  if (typeof value !== "object") {
    return "INVALID";
  }
  if (ancestors.has(value)) {
    return "INVALID";
  }

  ancestors.add(value);
  let result: JsonValidation = "VALID";
  if (Array.isArray(value)) {
    for (const item of value) {
      if (validateJson(item, ancestors) !== "VALID") {
        result = "INVALID";
        break;
      }
    }
  } else if (!isPlainObject(value)) {
    result = "INVALID";
  } else if (Object.getOwnPropertySymbols(value).length > 0) {
    result = "INVALID";
  } else {
    for (const descriptor of Object.values(
      Object.getOwnPropertyDescriptors(value),
    )) {
      if (
        descriptor.enumerable !== true
        || !Object.hasOwn(descriptor, "value")
        || validateJson(descriptor.value, ancestors) !== "VALID"
      ) {
        result = "INVALID";
        break;
      }
    }
  }
  ancestors.delete(value);
  return result;
}

export function isEmployeeApiJsonValue(
  value: unknown,
): value is EmployeeApiJsonValue {
  return validateJson(value, new WeakSet<object>()) === "VALID";
}

export function isEmployeeApiHeaders(
  value: unknown,
): value is EmployeeApiHeaders {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    return false;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Object.entries(descriptors).every(
    ([key, descriptor]) => (
      key.length > 0
      && descriptor.enumerable === true
      && Object.hasOwn(descriptor, "value")
      && typeof descriptor.value === "string"
    ),
  );
}

function hasOnlyKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return (
    Object.getOwnPropertySymbols(value).length === 0
    && keys.every((key) => allowed.some((candidate) => candidate === key))
  );
}

function requestValidation(
  value: unknown,
): EmployeeApiClientErrorCode | undefined {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return "INVALID_REQUEST";
  }
  const request = value as Readonly<Record<string, unknown>>;
  if (!hasOnlyKeys(request, ["method", "path", "headers", "body"])) {
    return "INVALID_REQUEST";
  }
  if (!Object.hasOwn(request, "method") || !Object.hasOwn(request, "path")) {
    return "INVALID_REQUEST";
  }
  if (!isEmployeeApiMethod(request.method)) {
    return "INVALID_METHOD";
  }
  if (!isEmployeeApiPath(request.path)) {
    return "INVALID_PATH";
  }
  if (
    Object.hasOwn(request, "headers")
    && request.headers !== undefined
    && !isEmployeeApiHeaders(request.headers)
  ) {
    return "INVALID_HEADERS";
  }
  if (request.method === "GET" && Object.hasOwn(request, "body")) {
    return "INVALID_BODY";
  }
  if (
    request.method === "POST"
    && Object.hasOwn(request, "body")
    && request.body !== undefined
    && !isEmployeeApiJsonValue(request.body)
  ) {
    return "INVALID_BODY";
  }
  return undefined;
}

export function isEmployeeApiRequest(
  value: unknown,
): value is EmployeeApiRequest {
  return requestValidation(value) === undefined;
}

export function isEmployeeApiResponse(
  value: unknown,
): value is EmployeeApiResponse {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  const response = value as Readonly<Record<string, unknown>>;
  if (!hasOnlyKeys(response, ["status", "headers", "body"])) {
    return false;
  }
  if (
    !Number.isInteger(response.status)
    || (response.status as number) < 100
    || (response.status as number) > 599
  ) {
    return false;
  }
  if (
    Object.hasOwn(response, "headers")
    && response.headers !== undefined
    && !isEmployeeApiHeaders(response.headers)
  ) {
    return false;
  }
  return (
    !Object.hasOwn(response, "body")
    || response.body === undefined
    || isEmployeeApiJsonValue(response.body)
  );
}

function isEmployeeApiTransport(
  value: unknown,
): value is EmployeeApiTransport {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Readonly<Record<string, unknown>>;
  return typeof candidate.request === "function";
}

function cloneJson(value: EmployeeApiJsonValue): EmployeeApiJsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => cloneJson(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneJson(item)]),
    );
  }
  return value;
}

function freezeJson(value: EmployeeApiJsonValue): EmployeeApiJsonValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => freezeJson(item)));
  }
  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, freezeJson(item)]),
      ),
    );
  }
  return value;
}

function snapshotHeaders(
  headers: EmployeeApiHeaders | undefined,
): EmployeeApiHeaders | undefined {
  return headers === undefined
    ? undefined
    : Object.freeze({ ...headers });
}

function snapshotRequest(request: EmployeeApiRequest): EmployeeApiRequest {
  const headers = snapshotHeaders(request.headers);
  if (request.method === "GET") {
    return Object.freeze({
      method: request.method,
      path: request.path,
      ...(headers === undefined ? {} : { headers }),
    });
  }
  const body = request.body === undefined
    ? undefined
    : freezeJson(cloneJson(request.body));
  return Object.freeze({
    method: request.method,
    path: request.path,
    ...(headers === undefined ? {} : { headers }),
    ...(body === undefined ? {} : { body }),
  });
}

function snapshotResponse(response: EmployeeApiResponse): EmployeeApiResponse {
  const headers = snapshotHeaders(response.headers);
  const body = response.body === undefined
    ? undefined
    : freezeJson(cloneJson(response.body));
  return Object.freeze({
    status: response.status,
    ...(headers === undefined ? {} : { headers }),
    ...(body === undefined ? {} : { body }),
  });
}

function failure(
  errorCode: EmployeeApiClientErrorCode,
): EmployeeApiClientResult {
  return Object.freeze({ ok: false, errorCode });
}

export function createEmployeeApiClient(
  transport: EmployeeApiTransport,
): EmployeeApiClient {
  if (!isEmployeeApiTransport(transport)) {
    throw new Error("INVALID_TRANSPORT");
  }

  const client: EmployeeApiClient = {
    async request(request: EmployeeApiRequest): Promise<EmployeeApiClientResult> {
      const validationError = requestValidation(request);
      if (validationError !== undefined) {
        return failure(validationError);
      }

      const requestSnapshot = snapshotRequest(request);
      let responseValue: unknown;
      try {
        responseValue = await transport.request(requestSnapshot);
      } catch {
        return failure("TRANSPORT_FAILED");
      }

      if (!isEmployeeApiResponse(responseValue)) {
        return failure("INVALID_RESPONSE");
      }
      if (responseValue.status < 200 || responseValue.status > 299) {
        return failure("HTTP_ERROR_STATUS");
      }

      return Object.freeze({
        ok: true,
        response: snapshotResponse(responseValue),
      });
    },
  };

  return Object.freeze(client);
}

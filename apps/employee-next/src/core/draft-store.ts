import { isEmployeeEventId } from "./event-contract";
import type { EmployeeEventId } from "./event-contract";

export type EmployeeDraftScopeId = string;
export type EmployeeDraftId = string;

export type EmployeeDraftPayload =
  | string
  | number
  | boolean
  | null
  | readonly EmployeeDraftPayload[]
  | Readonly<{ [key: string]: EmployeeDraftPayload }>;

export interface EmployeeDraftRecord {
  readonly draft_id: EmployeeDraftId;
  readonly event_id: EmployeeEventId;
  readonly payload: EmployeeDraftPayload;
  readonly updated_at_iso: string;
}

export interface EmployeeDraftStoragePort {
  list(scopeId: EmployeeDraftScopeId): Promise<unknown>;
  read(
    scopeId: EmployeeDraftScopeId,
    draftId: EmployeeDraftId,
  ): Promise<unknown>;
  write(
    scopeId: EmployeeDraftScopeId,
    record: EmployeeDraftRecord,
  ): Promise<unknown>;
  remove(
    scopeId: EmployeeDraftScopeId,
    draftId: EmployeeDraftId,
  ): Promise<unknown>;
}

export const EMPLOYEE_DRAFT_STORE_ERROR_CODES = Object.freeze([
  "EMPLOYEE_DRAFT_STORE_INVALID_STORAGE_PORT",
  "EMPLOYEE_DRAFT_STORE_INVALID_SCOPE_ID",
  "EMPLOYEE_DRAFT_STORE_INVALID_DRAFT_ID",
  "EMPLOYEE_DRAFT_STORE_INVALID_EVENT_ID",
  "EMPLOYEE_DRAFT_STORE_INVALID_PAYLOAD",
  "EMPLOYEE_DRAFT_STORE_INVALID_RECORD",
  "EMPLOYEE_DRAFT_STORE_SECRET_FIELD",
  "EMPLOYEE_DRAFT_STORE_STORAGE_LIST_FAILED",
  "EMPLOYEE_DRAFT_STORE_STORAGE_READ_FAILED",
  "EMPLOYEE_DRAFT_STORE_STORAGE_WRITE_FAILED",
  "EMPLOYEE_DRAFT_STORE_STORAGE_REMOVE_FAILED",
  "EMPLOYEE_DRAFT_STORE_INVALID_STORAGE_DATA",
  "EMPLOYEE_DRAFT_STORE_DUPLICATE_DRAFT_ID",
  "EMPLOYEE_DRAFT_STORE_DRAFT_NOT_FOUND",
] as const);

export type EmployeeDraftStoreErrorCode =
  (typeof EMPLOYEE_DRAFT_STORE_ERROR_CODES)[number];

export type EmployeeDraftStoreResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; errorCode: EmployeeDraftStoreErrorCode }>;

export interface EmployeeDraftStore {
  readonly scopeId: EmployeeDraftScopeId;
  list(): Promise<EmployeeDraftStoreResult<readonly EmployeeDraftRecord[]>>;
  read(
    draftId: EmployeeDraftId,
  ): Promise<EmployeeDraftStoreResult<EmployeeDraftRecord | undefined>>;
  save(
    record: EmployeeDraftRecord,
  ): Promise<EmployeeDraftStoreResult<EmployeeDraftRecord>>;
  remove(
    draftId: EmployeeDraftId,
  ): Promise<EmployeeDraftStoreResult<undefined>>;
}

const forbiddenSensitiveKeys = Object.freeze([
  "password",
  "pin",
  "secret",
  "token",
  "session_token",
  "raw_credentials",
  "provider_password",
  "cookie",
  "authorization_header",
] as const);

const draftRecordKeys = Object.freeze([
  "draft_id",
  "event_id",
  "payload",
  "updated_at_iso",
] as const);

type PayloadValidation = "VALID" | "INVALID" | "SECRET";

export function isEmployeeDraftScopeId(
  value: unknown,
): value is EmployeeDraftScopeId {
  return typeof value === "string" && value.length > 0;
}

export function isEmployeeDraftId(value: unknown): value is EmployeeDraftId {
  return typeof value === "string" && value.length > 0;
}

function isPlainObject(
  value: object,
): value is Readonly<Record<string, unknown>> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isSensitiveKey(value: string): boolean {
  const normalized = value.toLowerCase();
  return forbiddenSensitiveKeys.some((key) => key === normalized);
}

function validatePayload(
  value: unknown,
  ancestors: WeakSet<object>,
): PayloadValidation {
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
  let result: PayloadValidation = "VALID";

  if (Array.isArray(value)) {
    for (const item of value) {
      const itemResult = validatePayload(item, ancestors);
      if (itemResult !== "VALID") {
        result = itemResult;
        break;
      }
    }
  } else if (!isPlainObject(value)) {
    result = "INVALID";
  } else {
    const symbols = Object.getOwnPropertySymbols(value);
    if (symbols.length > 0) {
      result = "INVALID";
    } else {
      for (const [key, descriptor] of Object.entries(
        Object.getOwnPropertyDescriptors(value),
      )) {
        if (isSensitiveKey(key)) {
          result = "SECRET";
          break;
        }
        if (
          descriptor.enumerable !== true
          || !Object.hasOwn(descriptor, "value")
        ) {
          result = "INVALID";
          break;
        }
        const itemResult = validatePayload(descriptor.value, ancestors);
        if (itemResult !== "VALID") {
          result = itemResult;
          break;
        }
      }
    }
  }

  ancestors.delete(value);
  return result;
}

export function isEmployeeDraftPayload(
  value: unknown,
): value is EmployeeDraftPayload {
  return validatePayload(value, new WeakSet<object>()) === "VALID";
}

function hasExactRecordKeys(value: Readonly<Record<string, unknown>>): boolean {
  const keys = Object.keys(value).sort();
  return (
    keys.length === draftRecordKeys.length
    && draftRecordKeys.every((key, index) => key === keys[index])
  );
}

function recordValidation(
  value: unknown,
): EmployeeDraftStoreErrorCode | undefined {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return "EMPLOYEE_DRAFT_STORE_INVALID_RECORD";
  }

  const record = value as Readonly<Record<string, unknown>>;
  for (const key of Object.keys(record)) {
    if (isSensitiveKey(key)) {
      return "EMPLOYEE_DRAFT_STORE_SECRET_FIELD";
    }
  }
  if (!hasExactRecordKeys(record)) {
    return "EMPLOYEE_DRAFT_STORE_INVALID_RECORD";
  }
  if (!isEmployeeDraftId(record.draft_id)) {
    return "EMPLOYEE_DRAFT_STORE_INVALID_DRAFT_ID";
  }
  if (!isEmployeeEventId(record.event_id)) {
    return "EMPLOYEE_DRAFT_STORE_INVALID_EVENT_ID";
  }

  const payloadResult = validatePayload(
    record.payload,
    new WeakSet<object>(),
  );
  if (payloadResult === "SECRET") {
    return "EMPLOYEE_DRAFT_STORE_SECRET_FIELD";
  }
  if (payloadResult === "INVALID") {
    return "EMPLOYEE_DRAFT_STORE_INVALID_PAYLOAD";
  }
  if (
    typeof record.updated_at_iso !== "string"
    || record.updated_at_iso.length === 0
  ) {
    return "EMPLOYEE_DRAFT_STORE_INVALID_RECORD";
  }
  return undefined;
}

export function isEmployeeDraftRecord(
  value: unknown,
): value is EmployeeDraftRecord {
  return recordValidation(value) === undefined;
}

function isEmployeeDraftStoragePort(
  value: unknown,
): value is EmployeeDraftStoragePort {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Readonly<Record<string, unknown>>;
  return (
    typeof candidate.list === "function"
    && typeof candidate.read === "function"
    && typeof candidate.write === "function"
    && typeof candidate.remove === "function"
  );
}

function clonePayload(value: EmployeeDraftPayload): EmployeeDraftPayload {
  if (Array.isArray(value)) {
    return value.map((item) => clonePayload(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clonePayload(item)]),
    );
  }
  return value;
}

function cloneRecord(record: EmployeeDraftRecord): EmployeeDraftRecord {
  return {
    draft_id: record.draft_id,
    event_id: record.event_id,
    payload: clonePayload(record.payload),
    updated_at_iso: record.updated_at_iso,
  };
}

function freezePayload(value: EmployeeDraftPayload): EmployeeDraftPayload {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => freezePayload(item)));
  }
  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, freezePayload(item)]),
      ),
    );
  }
  return value;
}

function snapshotRecord(record: EmployeeDraftRecord): EmployeeDraftRecord {
  return Object.freeze({
    draft_id: record.draft_id,
    event_id: record.event_id,
    payload: freezePayload(record.payload),
    updated_at_iso: record.updated_at_iso,
  });
}

function success<T>(value: T): EmployeeDraftStoreResult<T> {
  return Object.freeze({ ok: true, value });
}

function failure<T>(
  errorCode: EmployeeDraftStoreErrorCode,
): EmployeeDraftStoreResult<T> {
  return Object.freeze({ ok: false, errorCode });
}

function validatedList(
  value: unknown,
): EmployeeDraftStoreResult<readonly EmployeeDraftRecord[]> {
  if (!Array.isArray(value)) {
    return failure("EMPLOYEE_DRAFT_STORE_INVALID_STORAGE_DATA");
  }

  const draftIds = new Set<string>();
  const records: EmployeeDraftRecord[] = [];
  for (const item of value) {
    if (!isEmployeeDraftRecord(item)) {
      return failure("EMPLOYEE_DRAFT_STORE_INVALID_STORAGE_DATA");
    }
    if (draftIds.has(item.draft_id)) {
      return failure("EMPLOYEE_DRAFT_STORE_DUPLICATE_DRAFT_ID");
    }
    draftIds.add(item.draft_id);
    records.push(snapshotRecord(item));
  }
  return success(Object.freeze(records));
}

export function createEmployeeDraftStore(
  scopeId: EmployeeDraftScopeId,
  storage: EmployeeDraftStoragePort,
): EmployeeDraftStore {
  if (!isEmployeeDraftScopeId(scopeId)) {
    throw new Error("EMPLOYEE_DRAFT_STORE_INVALID_SCOPE_ID");
  }
  if (!isEmployeeDraftStoragePort(storage)) {
    throw new Error("EMPLOYEE_DRAFT_STORE_INVALID_STORAGE_PORT");
  }

  const store: EmployeeDraftStore = {
    scopeId,

    async list(): Promise<
      EmployeeDraftStoreResult<readonly EmployeeDraftRecord[]>
    > {
      try {
        return validatedList(await storage.list(scopeId));
      } catch {
        return failure("EMPLOYEE_DRAFT_STORE_STORAGE_LIST_FAILED");
      }
    },

    async read(
      draftId: EmployeeDraftId,
    ): Promise<EmployeeDraftStoreResult<EmployeeDraftRecord | undefined>> {
      if (!isEmployeeDraftId(draftId)) {
        return failure("EMPLOYEE_DRAFT_STORE_INVALID_DRAFT_ID");
      }
      try {
        const value = await storage.read(scopeId, draftId);
        if (value === undefined) {
          return success(undefined);
        }
        if (!isEmployeeDraftRecord(value) || value.draft_id !== draftId) {
          return failure("EMPLOYEE_DRAFT_STORE_INVALID_STORAGE_DATA");
        }
        return success(snapshotRecord(value));
      } catch {
        return failure("EMPLOYEE_DRAFT_STORE_STORAGE_READ_FAILED");
      }
    },

    async save(
      record: EmployeeDraftRecord,
    ): Promise<EmployeeDraftStoreResult<EmployeeDraftRecord>> {
      const validationError = recordValidation(record);
      if (validationError !== undefined) {
        return failure(validationError);
      }

      const existing = await store.list();
      if (!existing.ok) {
        return failure(existing.errorCode);
      }
      if (existing.value.some((item) => item.draft_id === record.draft_id)) {
        return failure("EMPLOYEE_DRAFT_STORE_DUPLICATE_DRAFT_ID");
      }

      const storageRecord = cloneRecord(record);
      const resultSnapshot = snapshotRecord(record);
      try {
        await storage.write(scopeId, storageRecord);
        return success(resultSnapshot);
      } catch {
        return failure("EMPLOYEE_DRAFT_STORE_STORAGE_WRITE_FAILED");
      }
    },

    async remove(
      draftId: EmployeeDraftId,
    ): Promise<EmployeeDraftStoreResult<undefined>> {
      if (!isEmployeeDraftId(draftId)) {
        return failure("EMPLOYEE_DRAFT_STORE_INVALID_DRAFT_ID");
      }

      const existing = await store.read(draftId);
      if (!existing.ok) {
        return failure(existing.errorCode);
      }
      if (existing.value === undefined) {
        return failure("EMPLOYEE_DRAFT_STORE_DRAFT_NOT_FOUND");
      }

      try {
        await storage.remove(scopeId, draftId);
        return success(undefined);
      } catch {
        return failure("EMPLOYEE_DRAFT_STORE_STORAGE_REMOVE_FAILED");
      }
    },
  };

  return Object.freeze(store);
}

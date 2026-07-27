import {
  employeeNextDraftStorageKey,
  isEmployeeDraftPayload,
  isEmployeeDraftScopeId,
  type EmployeeDraftPayload,
  type EmployeeDraftScopeId,
} from "./core/draft-store";
import type { EmployeeAuthSession } from "./core/auth";
import {
  isEmployeeEventId,
  type EmployeeEventId,
} from "./core/event-contract";

export interface EmployeeNextSessionDraftEntry {
  readonly entry_id: string;
  readonly event_type: EmployeeEventId;
  readonly payload: EmployeeDraftPayload;
  readonly cash_amount_aed: number;
  readonly bank_amount_aed: number;
}

export interface EmployeeNextSessionDraft {
  readonly session_id: string;
  readonly entries: readonly EmployeeNextSessionDraftEntry[];
}

export interface EmployeeNextSessionDraftEnvelope {
  readonly schema_version: 1;
  readonly scope: EmployeeDraftScopeId;
  readonly session: EmployeeNextSessionDraft;
  readonly revision: number;
  readonly saved_at: string;
}

export interface EmployeeNextSessionDraftStoragePort {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
}

export const EMPLOYEE_NEXT_DRAFT_ERROR_CODES = Object.freeze([
  "DRAFT_SCOPE_UNAVAILABLE",
  "DRAFT_STORAGE_UNAVAILABLE",
  "DRAFT_ENVELOPE_INVALID",
  "DRAFT_SAVE_FAILED",
] as const);

export type EmployeeNextDraftErrorCode =
  (typeof EMPLOYEE_NEXT_DRAFT_ERROR_CODES)[number];

export type EmployeeNextSessionDraftView =
  | Readonly<{ status: "AUTH_RESTORING" }>
  | Readonly<{ status: "DRAFT_RESTORING" }>
  | Readonly<{
    status: "CURRENT_SESSION_READY";
    session?: EmployeeNextSessionDraft;
    entryCount: number;
    cashTotalAed: number;
    bankTotalAed: number;
    errorCode?: "DRAFT_SAVE_FAILED";
  }>
  | Readonly<{
    status: "DRAFT_UNAVAILABLE";
    errorCode: Exclude<EmployeeNextDraftErrorCode, "DRAFT_SAVE_FAILED">;
  }>;

export type EmployeeNextSessionDraftResult =
  | Readonly<{ ok: true; view: EmployeeNextSessionDraftView }>
  | Readonly<{
    ok: false;
    errorCode: EmployeeNextDraftErrorCode;
    view: EmployeeNextSessionDraftView;
  }>;

export interface EmployeeNextSessionDraftController {
  getView(): EmployeeNextSessionDraftView;
  getSession(): EmployeeNextSessionDraft | undefined;
  restore(session: unknown): Promise<EmployeeNextSessionDraftResult>;
  addToSession(input: Readonly<{
    sessionId: string;
    entry: EmployeeNextSessionDraftEntry;
  }>): Promise<EmployeeNextSessionDraftResult>;
}

const entryKeys = Object.freeze([
  "bank_amount_aed",
  "cash_amount_aed",
  "entry_id",
  "event_type",
  "payload",
] as const);
const sessionKeys = Object.freeze(["entries", "session_id"] as const);
const envelopeKeys = Object.freeze([
  "revision",
  "saved_at",
  "schema_version",
  "scope",
  "session",
] as const);

function isPlainObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value).sort();
  return (
    Object.getOwnPropertySymbols(value).length === 0
    && keys.length === expected.length
    && expected.every((key, index) => key === keys[index])
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isMoney(value: unknown): value is number {
  return (
    typeof value === "number"
    && Number.isFinite(value)
    && value >= 0
    && Math.round(value * 100) === value * 100
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string"
    && value.length > 0
    && Number.isFinite(Date.parse(value))
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

function snapshotEntry(
  entry: EmployeeNextSessionDraftEntry,
): EmployeeNextSessionDraftEntry {
  return Object.freeze({
    entry_id: entry.entry_id,
    event_type: entry.event_type,
    payload: freezePayload(clonePayload(entry.payload)),
    cash_amount_aed: entry.cash_amount_aed,
    bank_amount_aed: entry.bank_amount_aed,
  });
}

function snapshotSession(
  session: EmployeeNextSessionDraft,
): EmployeeNextSessionDraft {
  return Object.freeze({
    session_id: session.session_id,
    entries: Object.freeze(session.entries.map((entry) => snapshotEntry(entry))),
  });
}

function isEntry(value: unknown): value is EmployeeNextSessionDraftEntry {
  if (!isPlainObject(value) || !hasExactKeys(value, entryKeys)) {
    return false;
  }
  return (
    isNonEmptyString(value.entry_id)
    && isEmployeeEventId(value.event_type)
    && isEmployeeDraftPayload(value.payload)
    && isMoney(value.cash_amount_aed)
    && isMoney(value.bank_amount_aed)
  );
}

function isSession(value: unknown): value is EmployeeNextSessionDraft {
  if (!isPlainObject(value) || !hasExactKeys(value, sessionKeys)) {
    return false;
  }
  if (!isNonEmptyString(value.session_id) || !Array.isArray(value.entries)) {
    return false;
  }
  const ids = new Set<string>();
  for (const entry of value.entries) {
    if (!isEntry(entry) || ids.has(entry.entry_id)) {
      return false;
    }
    ids.add(entry.entry_id);
  }
  return true;
}

function isEnvelope(value: unknown): value is EmployeeNextSessionDraftEnvelope {
  if (!isPlainObject(value) || !hasExactKeys(value, envelopeKeys)) {
    return false;
  }
  return (
    value.schema_version === 1
    && isEmployeeDraftScopeId(value.scope)
    && isSession(value.session)
    && Number.isSafeInteger(value.revision)
    && (value.revision as number) > 0
    && isIsoTimestamp(value.saved_at)
  );
}

function sameScope(
  first: EmployeeDraftScopeId,
  second: EmployeeDraftScopeId,
): boolean {
  return first.corpid === second.corpid && first.userid === second.userid;
}

function isStoragePort(
  value: unknown,
): value is EmployeeNextSessionDraftStoragePort {
  return (
    typeof value === "object"
    && value !== null
    && typeof (value as Readonly<Record<string, unknown>>).getItem === "function"
    && typeof (value as Readonly<Record<string, unknown>>).setItem === "function"
  );
}

export function createEmployeeDraftScope(
  session: unknown,
): EmployeeDraftScopeId | undefined {
  if (
    !isPlainObject(session)
    || !isPlainObject(session.user)
    || session.user.role !== "STAFF"
    || !isNonEmptyString(session.user.corpid)
    || !isNonEmptyString(session.user.userid)
  ) {
    return undefined;
  }
  const scope = {
    corpid: session.user.corpid.trim(),
    userid: session.user.userid.trim(),
  };
  return isEmployeeDraftScopeId(scope) ? Object.freeze(scope) : undefined;
}

function readyView(
  session: EmployeeNextSessionDraft | undefined,
  errorCode?: "DRAFT_SAVE_FAILED",
): EmployeeNextSessionDraftView {
  const entries = session?.entries ?? [];
  return Object.freeze({
    status: "CURRENT_SESSION_READY",
    ...(session === undefined ? {} : { session }),
    entryCount: entries.length,
    cashTotalAed: entries.reduce(
      (total, entry) => total + entry.cash_amount_aed,
      0,
    ),
    bankTotalAed: entries.reduce(
      (total, entry) => total + entry.bank_amount_aed,
      0,
    ),
    ...(errorCode === undefined ? {} : { errorCode }),
  });
}

function unavailableView(
  errorCode: Exclude<EmployeeNextDraftErrorCode, "DRAFT_SAVE_FAILED">,
): EmployeeNextSessionDraftView {
  return Object.freeze({ status: "DRAFT_UNAVAILABLE", errorCode });
}

function success(
  view: EmployeeNextSessionDraftView,
): EmployeeNextSessionDraftResult {
  return Object.freeze({ ok: true, view });
}

function failure(
  errorCode: EmployeeNextDraftErrorCode,
  view: EmployeeNextSessionDraftView,
): EmployeeNextSessionDraftResult {
  return Object.freeze({ ok: false, errorCode, view });
}

export function createEmployeeNextSessionDraftController(
  storage: EmployeeNextSessionDraftStoragePort,
  now: () => string = () => new Date().toISOString(),
): EmployeeNextSessionDraftController {
  if (!isStoragePort(storage) || typeof now !== "function") {
    throw new Error("EMPLOYEE_NEXT_DRAFT_INVALID_OPTIONS");
  }

  let view: EmployeeNextSessionDraftView = Object.freeze({
    status: "AUTH_RESTORING",
  });
  let scope: EmployeeDraftScopeId | undefined;
  let session: EmployeeNextSessionDraft | undefined;
  let revision = 0;

  const controller: EmployeeNextSessionDraftController = {
    getView(): EmployeeNextSessionDraftView {
      return view;
    },

    getSession(): EmployeeNextSessionDraft | undefined {
      return session;
    },

    async restore(
      authSession: unknown,
    ): Promise<EmployeeNextSessionDraftResult> {
      scope = undefined;
      session = undefined;
      revision = 0;

      const nextScope = createEmployeeDraftScope(authSession);
      if (nextScope === undefined) {
        view = unavailableView("DRAFT_SCOPE_UNAVAILABLE");
        return failure("DRAFT_SCOPE_UNAVAILABLE", view);
      }

      scope = nextScope;
      view = Object.freeze({ status: "DRAFT_RESTORING" });
      const key = employeeNextDraftStorageKey(nextScope);
      let raw: string | null;
      try {
        raw = await storage.getItem(key);
      } catch {
        view = unavailableView("DRAFT_STORAGE_UNAVAILABLE");
        return failure("DRAFT_STORAGE_UNAVAILABLE", view);
      }

      if (raw === null) {
        view = readyView(undefined);
        return success(view);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        view = unavailableView("DRAFT_ENVELOPE_INVALID");
        return failure("DRAFT_ENVELOPE_INVALID", view);
      }
      if (!isEnvelope(parsed) || !sameScope(parsed.scope, nextScope)) {
        view = unavailableView("DRAFT_ENVELOPE_INVALID");
        return failure("DRAFT_ENVELOPE_INVALID", view);
      }

      session = snapshotSession(parsed.session);
      revision = parsed.revision;
      view = readyView(session);
      return success(view);
    },

    async addToSession(
      input: Readonly<{
        sessionId: string;
        entry: EmployeeNextSessionDraftEntry;
      }>,
    ): Promise<EmployeeNextSessionDraftResult> {
      if (
        scope === undefined
        || view.status !== "CURRENT_SESSION_READY"
        || !isPlainObject(input)
        || !isNonEmptyString(input.sessionId)
        || !isEntry(input.entry)
        || (
          session !== undefined
          && session.session_id !== input.sessionId
        )
        || session?.entries.some(
          (entry) => entry.entry_id === input.entry.entry_id,
        ) === true
      ) {
        const unavailable = unavailableView("DRAFT_ENVELOPE_INVALID");
        return failure("DRAFT_ENVELOPE_INVALID", unavailable);
      }

      const nextSession = snapshotSession({
        session_id: input.sessionId,
        entries: [
          ...(session?.entries ?? []),
          snapshotEntry(input.entry),
        ],
      });
      const envelope: EmployeeNextSessionDraftEnvelope = Object.freeze({
        schema_version: 1,
        scope,
        session: nextSession,
        revision: revision + 1,
        saved_at: now(),
      });
      if (!isEnvelope(envelope)) {
        return failure("DRAFT_ENVELOPE_INVALID", view);
      }

      let serialized: string;
      try {
        serialized = JSON.stringify(envelope);
        await storage.setItem(employeeNextDraftStorageKey(scope), serialized);
      } catch {
        view = readyView(session, "DRAFT_SAVE_FAILED");
        return failure("DRAFT_SAVE_FAILED", view);
      }

      session = nextSession;
      revision = envelope.revision;
      view = readyView(session);
      return success(view);
    },
  };

  return Object.freeze(controller);
}

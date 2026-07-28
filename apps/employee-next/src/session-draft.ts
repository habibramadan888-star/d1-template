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
  readonly anchor_id?: string;
  readonly cloud_sync_required?: true;
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
  removeItem(key: string): void | Promise<void>;
}

export const EMPLOYEE_NEXT_DRAFT_ERROR_CODES = Object.freeze([
  "DRAFT_SCOPE_UNAVAILABLE",
  "DRAFT_STORAGE_UNAVAILABLE",
  "DRAFT_ENVELOPE_INVALID",
  "DRAFT_SAVE_FAILED",
  "DRAFT_DELETE_FAILED",
] as const);

export type EmployeeNextDraftErrorCode =
  (typeof EMPLOYEE_NEXT_DRAFT_ERROR_CODES)[number];

export interface EmployeeNextSessionDraftSummary {
  readonly cashReceivedAed: number;
  readonly bankReceivedAed: number;
  readonly totalReceivedAed: number;
  readonly cashExpensesAed: number;
  readonly bankExpensesAed: number;
  readonly expensesAed: number;
  readonly cashNetAed: number;
  readonly bankNetAed: number;
  readonly netFundsAed: number;
}

export type EmployeeNextSessionDraftView =
  | Readonly<{ status: "AUTH_RESTORING" }>
  | Readonly<{ status: "DRAFT_RESTORING" }>
  | Readonly<{
    status: "CURRENT_SESSION_READY";
    session?: EmployeeNextSessionDraft;
    entryCount: number;
    cashTotalAed: number;
    bankTotalAed: number;
    summary: EmployeeNextSessionDraftSummary;
    errorCode?: "DRAFT_SAVE_FAILED" | "DRAFT_DELETE_FAILED";
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
  removeLocalDraft(entryId: string): Promise<EmployeeNextSessionDraftResult>;
  setCloudAnchor(anchorId: string): Promise<EmployeeNextSessionDraftResult>;
  markCloudSyncRequired(): Promise<EmployeeNextSessionDraftResult>;
}

const entryKeys = Object.freeze([
  "bank_amount_aed",
  "cash_amount_aed",
  "entry_id",
  "event_type",
  "payload",
] as const);
const sessionKeys = Object.freeze(["entries", "session_id"] as const);
const anchoredSessionKeys = Object.freeze([
  "anchor_id",
  "entries",
  "session_id",
] as const);
const syncRequiredSessionKeys = Object.freeze([
  "cloud_sync_required",
  "entries",
  "session_id",
] as const);
const anchoredSyncRequiredSessionKeys = Object.freeze([
  "anchor_id",
  "cloud_sync_required",
  "entries",
  "session_id",
] as const);
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
    ...(session.anchor_id === undefined
      ? {}
      : { anchor_id: session.anchor_id }),
    ...(session.cloud_sync_required === true
      ? { cloud_sync_required: true as const }
      : {}),
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
  if (
    !isPlainObject(value)
    || !(
      hasExactKeys(value, sessionKeys)
      || hasExactKeys(value, anchoredSessionKeys)
      || hasExactKeys(value, syncRequiredSessionKeys)
      || hasExactKeys(value, anchoredSyncRequiredSessionKeys)
    )
  ) {
    return false;
  }
  if (
    !isNonEmptyString(value.session_id)
    || (
      value.anchor_id !== undefined
      && !isNonEmptyString(value.anchor_id)
    )
    || (
      value.cloud_sync_required !== undefined
      && value.cloud_sync_required !== true
    )
    || !Array.isArray(value.entries)
  ) {
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
    && typeof (value as Readonly<Record<string, unknown>>).removeItem === "function"
  );
}

export function createEmployeeDraftScope(
  session: unknown,
): EmployeeDraftScopeId | undefined {
  if (
    !isPlainObject(session)
    || !isPlainObject(session.user)
    || !["EMPLOYEE", "STAFF"].includes(String(session.user.role))
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

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function paymentLegTotals(
  value: EmployeeDraftPayload | undefined,
): Readonly<{ cash: number; bank: number }> {
  if (!isPlainObject(value) || !Array.isArray(value.legs)) {
    return Object.freeze({ cash: 0, bank: 0 });
  }
  let cash = 0;
  let bank = 0;
  for (const leg of value.legs) {
    if (!isPlainObject(leg) || !isMoney(leg.amountAed)) {
      continue;
    }
    if (leg.method === "cash") cash += leg.amountAed;
    if (leg.method === "bank") bank += leg.amountAed;
  }
  return Object.freeze({ cash: money(cash), bank: money(bank) });
}

function entryOutflows(
  entry: EmployeeNextSessionDraftEntry,
): Readonly<{ cash: number; bank: number }> {
  if (!isPlainObject(entry.payload)) {
    return Object.freeze({ cash: 0, bank: 0 });
  }
  if (entry.event_type === "expense") {
    return paymentLegTotals(entry.payload.payment);
  }
  if (entry.event_type === "deposit-out") {
    return paymentLegTotals(entry.payload.refund);
  }
  return Object.freeze({ cash: 0, bank: 0 });
}

export function calculateEmployeeNextSessionDraftSummary(
  entries: readonly EmployeeNextSessionDraftEntry[],
): EmployeeNextSessionDraftSummary {
  let cashReceived = 0;
  let bankReceived = 0;
  let cashExpenses = 0;
  let bankExpenses = 0;
  for (const entry of entries) {
    if (
      entry.event_type === "rent"
      || entry.event_type === "arrears-payment"
      || entry.event_type === "deposit-in"
      || entry.event_type === "bed-transfer"
    ) {
      cashReceived += entry.cash_amount_aed;
      bankReceived += entry.bank_amount_aed;
    }
    const outflows = entryOutflows(entry);
    cashExpenses += outflows.cash;
    bankExpenses += outflows.bank;
  }
  const cashReceivedAed = money(cashReceived);
  const bankReceivedAed = money(bankReceived);
  const cashExpensesAed = money(cashExpenses);
  const bankExpensesAed = money(bankExpenses);
  const totalReceivedAed = money(cashReceivedAed + bankReceivedAed);
  const expensesAed = money(cashExpensesAed + bankExpensesAed);
  return Object.freeze({
    cashReceivedAed,
    bankReceivedAed,
    totalReceivedAed,
    cashExpensesAed,
    bankExpensesAed,
    expensesAed,
    cashNetAed: money(cashReceivedAed - cashExpensesAed),
    bankNetAed: money(bankReceivedAed - bankExpensesAed),
    netFundsAed: money(totalReceivedAed - expensesAed),
  });
}

function readyView(
  session: EmployeeNextSessionDraft | undefined,
  errorCode?: "DRAFT_SAVE_FAILED" | "DRAFT_DELETE_FAILED",
): EmployeeNextSessionDraftView {
  const entries = session?.entries ?? [];
  const summary = calculateEmployeeNextSessionDraftSummary(entries);
  return Object.freeze({
    status: "CURRENT_SESSION_READY",
    ...(session === undefined ? {} : { session }),
    entryCount: entries.length,
    cashTotalAed: summary.cashReceivedAed,
    bankTotalAed: summary.bankReceivedAed,
    summary,
    ...(errorCode === undefined ? {} : { errorCode }),
  });
}

function unavailableView(
  errorCode: Exclude<
    EmployeeNextDraftErrorCode,
    "DRAFT_SAVE_FAILED" | "DRAFT_DELETE_FAILED"
  >,
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
        ...(session?.anchor_id === undefined
          ? {}
          : { anchor_id: session.anchor_id }),
        ...(session?.cloud_sync_required === true
          ? { cloud_sync_required: true as const }
          : {}),
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

    async removeLocalDraft(
      entryId: string,
    ): Promise<EmployeeNextSessionDraftResult> {
      if (
        scope === undefined
        || view.status !== "CURRENT_SESSION_READY"
        || session === undefined
        || !isNonEmptyString(entryId)
      ) {
        return failure("DRAFT_ENVELOPE_INVALID", view);
      }
      const targetIndex = session.entries.findIndex(
        (entry) => entry.entry_id === entryId,
      );
      if (targetIndex < 0) {
        return failure("DRAFT_ENVELOPE_INVALID", view);
      }

      const nextSession = snapshotSession({
        session_id: session.session_id,
        ...(session.anchor_id === undefined
          ? {}
          : { anchor_id: session.anchor_id }),
        ...(session.cloud_sync_required === true
          ? { cloud_sync_required: true as const }
          : {}),
        entries: session.entries.filter((_, index) => index !== targetIndex),
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

      const key = employeeNextDraftStorageKey(scope);
      try {
        const serialized = JSON.stringify(envelope);
        const verified: unknown = JSON.parse(serialized);
        if (!isEnvelope(verified) || !sameScope(verified.scope, scope)) {
          throw new Error("DRAFT_ENVELOPE_INVALID");
        }
        if (nextSession.entries.length === 0) {
          await storage.removeItem(key);
        } else {
          await storage.setItem(key, serialized);
        }
      } catch {
        view = readyView(session, "DRAFT_DELETE_FAILED");
        return failure("DRAFT_DELETE_FAILED", view);
      }

      session = nextSession.entries.length === 0 ? undefined : nextSession;
      revision = session === undefined ? 0 : envelope.revision;
      view = readyView(session);
      return success(view);
    },

    async setCloudAnchor(
      anchorId: string,
    ): Promise<EmployeeNextSessionDraftResult> {
      if (
        scope === undefined
        || view.status !== "CURRENT_SESSION_READY"
        || session === undefined
        || !isNonEmptyString(anchorId)
      ) {
        return failure("DRAFT_ENVELOPE_INVALID", view);
      }
      const normalizedAnchorId = anchorId.trim();
      if (normalizedAnchorId.length === 0) {
        return failure("DRAFT_ENVELOPE_INVALID", view);
      }
      if (session.anchor_id === normalizedAnchorId) {
        return success(view);
      }
      const nextSession = snapshotSession({
        session_id: session.session_id,
        anchor_id: normalizedAnchorId,
        ...(session.cloud_sync_required === true
          ? { cloud_sync_required: true as const }
          : {}),
        entries: session.entries,
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
      try {
        await storage.setItem(
          employeeNextDraftStorageKey(scope),
          JSON.stringify(envelope),
        );
      } catch {
        view = readyView(session, "DRAFT_SAVE_FAILED");
        return failure("DRAFT_SAVE_FAILED", view);
      }
      session = nextSession;
      revision = envelope.revision;
      view = readyView(session);
      return success(view);
    },

    async markCloudSyncRequired(): Promise<EmployeeNextSessionDraftResult> {
      if (
        scope === undefined
        || view.status !== "CURRENT_SESSION_READY"
        || session === undefined
      ) {
        return failure("DRAFT_ENVELOPE_INVALID", view);
      }
      if (session.cloud_sync_required === true) {
        return success(view);
      }
      const nextSession = snapshotSession({
        session_id: session.session_id,
        ...(session.anchor_id === undefined
          ? {}
          : { anchor_id: session.anchor_id }),
        cloud_sync_required: true,
        entries: session.entries,
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
      try {
        await storage.setItem(
          employeeNextDraftStorageKey(scope),
          JSON.stringify(envelope),
        );
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

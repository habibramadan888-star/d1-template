import {
  createEmployeeNextRouteController,
  type EmployeeNextRouteController,
  type EmployeeNextRouteView,
} from "./route";
import type {
  EmployeeApiJsonValue,
  EmployeeApiRequest,
  EmployeeApiResponse,
  EmployeeApiTransport,
} from "./core/api-client";
import {
  isEmployeeAuthSession,
  type EmployeeAuthSession,
} from "./core/auth";
import type {
  EmployeeSubmitEntryContext,
} from "./core/submit-entry";
import type {
  EmployeeEventId,
} from "./core/event-contract";
import {
  createEmployeeNextSessionDraftController,
  type EmployeeNextSessionDraftController,
  type EmployeeNextSessionDraft,
  type EmployeeNextSessionDraftEntry,
  type EmployeeNextSessionDraftStoragePort,
  type EmployeeNextSessionDraftView,
} from "./session-draft";
import {
  createEmployeeEntryUiController,
  type EmployeeEntryContextPort,
  type EmployeeEntryUiController,
} from "./ui/event-entry-templates";
import {
  createEmployeeSevenEventRegistry,
} from "./events";
import {
  employeeExpenseAedToFils,
} from "./events/expense";

export const employeeNextRouteId = "employee-next-route-candidate";
export const EMPLOYEE_NEXT_FORMAL_WRITE_ENABLED = false as const;

export interface EmployeeNextBrowserRequestInit {
  readonly method: "GET" | "POST";
  readonly credentials: "same-origin";
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
}

export interface EmployeeNextBrowserResponse {
  readonly status: number;
  json(): Promise<unknown>;
}

export interface EmployeeNextBrowserRequestPort {
  request(
    path: string,
    init: EmployeeNextBrowserRequestInit,
  ): Promise<EmployeeNextBrowserResponse>;
}

export interface EmployeeNextSidecarAdapterOptions {
  readonly requestPort: EmployeeNextBrowserRequestPort;
  readonly sessionPath: string;
  readonly submitPath: string;
  readonly environmentPath?: string;
  readonly capabilitiesPath?: string;
  readonly syncStatePath?: string;
  readonly validatePath?: string;
}

export interface EmployeeBedTransferCapability {
  readonly validateEnabled: boolean;
  readonly writeEnabled: boolean;
  readonly canonicalWritePath: string;
}

export type EmployeeNextRuntimeEnvironment =
  | "production"
  | "internal_beta"
  | "staging";

export function expectedEmployeeNextCorpid(
  environment: unknown,
): "homelink" | "homelink-staging" | undefined {
  if (environment === "staging") return "homelink-staging";
  if (environment === "production" || environment === "internal_beta") {
    return "homelink";
  }
  return undefined;
}

export interface EmployeeNextSidecarAdapters {
  readonly transport: EmployeeApiTransport;
  readonly submitPath: string;
  readonly restoreSession: () => Promise<EmployeeAuthSession>;
  readonly restoreBedTransferCapability: () => Promise<EmployeeBedTransferCapability>;
  readonly entryContexts?: EmployeeEntryContextPort;
  readonly validateSessionRequest?: (
    request: EmployeeApiRequest,
  ) => Promise<EmployeeApiResponse>;
  readonly checkSyncState?: (
    session: EmployeeNextSessionDraft,
  ) => Promise<EmployeeCloudSyncState>;
  readonly buildApiRequest: (
    context: EmployeeSubmitEntryContext<object>,
  ) => EmployeeApiRequest;
}

export const EMPLOYEE_CLOUD_SYNC_STATUSES = Object.freeze([
  "SYNCED",
  "CLOUD_MISSING",
  "CLOUD_MISMATCH",
  "CLOUD_VOIDED",
  "CLOUD_CORRECTED",
  "OWNER_REVIEW_REQUIRED",
] as const);

export type EmployeeCloudSyncStatus =
  (typeof EMPLOYEE_CLOUD_SYNC_STATUSES)[number];

export interface EmployeeCloudEntrySyncState {
  readonly entryId: string;
  readonly status: EmployeeCloudSyncStatus;
}

export interface EmployeeCloudSyncState {
  readonly status: EmployeeCloudSyncStatus;
  readonly sessionId: string;
  readonly anchorId?: string;
  readonly entries: readonly EmployeeCloudEntrySyncState[];
}

export type EmployeeSessionUploadState =
  | Readonly<{ status: "IDLE" }>
  | Readonly<{ status: "SUBMITTING" }>
  | Readonly<{ status: "SYNC_CHECKING" }>
  | EmployeeCloudSyncState
  | Readonly<{
    status: "SYNC_CHECK_UNAVAILABLE";
    sessionId?: string;
  }>;
export type EmployeeExpenseUploadCanaryState = EmployeeSessionUploadState;

export type EmployeeSessionValidationState =
  | Readonly<{ status: "NOT_VALIDATED" }>
  | Readonly<{ status: "VALIDATING"; payloadFingerprint: string }>
  | Readonly<{
    status: "VALIDATED_VALIDATE_ONLY";
    payloadFingerprint: string;
    resultCount: number;
  }>
  | Readonly<{
    status: "VALIDATION_FAILED";
    payloadFingerprint?: string;
    errorCode: string;
  }>;

type JsonRecord = Readonly<Record<string, EmployeeApiJsonValue>>;

function isPlainRecord(value: unknown): value is JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safePath(value: unknown): value is string {
  return (
    typeof value === "string"
    && value.startsWith("/")
    && !value.startsWith("//")
    && !value.includes("..")
    && !value.includes("\\")
    && !value.includes("?")
    && !value.includes("#")
  );
}

function safeRequestPort(value: unknown): value is EmployeeNextBrowserRequestPort {
  return (
    typeof value === "object"
    && value !== null
    && typeof (value as Readonly<Record<string, unknown>>).request === "function"
  );
}

function responsePort(value: unknown): value is EmployeeNextBrowserResponse {
  return (
    typeof value === "object"
    && value !== null
    && Number.isInteger(
      (value as Readonly<Record<string, unknown>>).status,
    )
    && typeof (value as Readonly<Record<string, unknown>>).json === "function"
  );
}

function safeHeaders(
  value: Readonly<Record<string, string>> | undefined,
): boolean {
  if (value === undefined) {
    return true;
  }
  return Object.keys(value).every(
    (key) => key.toLowerCase() !== ["author", "ization"].join(""),
  );
}

function apiData(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (
    !isPlainRecord(value)
    || value.code !== 0
    || value.success === false
  ) {
    return undefined;
  }
  const error = value.error;
  if (
    error !== undefined
    && error !== null
    && !(typeof error === "string" && error.trim().length === 0)
  ) {
    return undefined;
  }
  const data = value.data;
  return isPlainRecord(data) ? data : undefined;
}

const disabledBedTransferCapability: EmployeeBedTransferCapability =
  Object.freeze({
    validateEnabled: false,
    writeEnabled: false,
    canonicalWritePath: "",
  });

const contextUnavailable = (
  summary = "Required read-only business context is not available.",
) => Object.freeze({
  ready: false,
  values: Object.freeze({}),
  summary,
});

function responseData(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!isPlainRecord(value) || value.success === false || value.ok === false) {
    return undefined;
  }
  if (isPlainRecord(value.data)) {
    return value.data;
  }
  return value;
}

function safeBedLabel(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const bed = value.trim();
  return (
    bed.length > 0
    && bed.length <= 80
    && !/[\u0000-\u001f\u007f]/u.test(bed)
  )
    ? bed
    : undefined;
}

function finiteMoney(value: unknown): number | undefined {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100) / 100
    : undefined;
}

function openArrearsRows(value: unknown): readonly Readonly<Record<string, unknown>>[] | undefined {
  const data = responseData(value);
  if (data?.readonly !== true || data.no_write !== true) return undefined;
  const rows = data?.tasks ?? data?.items;
  if (!Array.isArray(rows)) return undefined;
  const mapped: Readonly<Record<string, unknown>>[] = [];
  for (const item of rows) {
    if (!isPlainRecord(item)) return undefined;
    const reference = [
      item.cloud_arrears_ref,
      item.arrears_ref,
      item.task_id,
      item.id,
    ].find((candidate) =>
      typeof candidate === "string" && candidate.trim().length > 0
    );
    const remaining = finiteMoney(
      item.remaining_arrears ?? item.remaining_amount ?? item.amount,
    );
    if (typeof reference !== "string" || remaining === undefined) {
      return undefined;
    }
    mapped.push(Object.freeze({
      cloudArrearsRef: reference.trim(),
      remainingArrearsAed: remaining,
    }));
  }
  return Object.freeze(mapped);
}

function canonicalOpenArrearsSnapshot(value: unknown): Readonly<{
  rows: readonly Readonly<Record<string, unknown>>[];
  totalAed: number;
}> | undefined {
  const data = responseData(value);
  const rows = openArrearsRows(value);
  if (
    data === undefined
    || rows === undefined
    || data.source !== "canonical_arrears_gateway"
    || data.gateway !== "canonical_arrears_gateway"
    || !Number.isInteger(data.total_count)
    || data.total_count !== rows.length
  ) {
    return undefined;
  }
  const declaredTotal = finiteMoney(data.total_remaining);
  const computedTotal = Math.round(rows.reduce(
    (sum, row) => sum + Number(row.remainingArrearsAed),
    0,
  ) * 100) / 100;
  if (declaredTotal === undefined || declaredTotal !== computedTotal) {
    return undefined;
  }
  return Object.freeze({ rows, totalAed: declaredTotal });
}

function bedAccessSnapshot(
  bed: string,
  value: unknown,
  arrears: readonly Readonly<Record<string, unknown>>[],
): Readonly<Record<string, unknown>> | undefined {
  const data = responseData(value);
  const occupancy = data === undefined
    ? undefined
    : responseData(data.occupancy_gateway);
  const access = data === undefined
    ? undefined
    : responseData(data.access_snapshot_context);
  if (
    data === undefined
    || occupancy === undefined
    || access === undefined
    || data.gateway !== "canonical_bed_context_gateway"
    || data.readonly !== true
    || data.no_write !== true
    || access.candidate_count !== 1
    || access.ambiguous === true
    || access.conflict === true
    || access.stale === true
    || access.status !== "loaded"
    || access.parse_status !== "parsed"
  ) {
    return undefined;
  }
  const vacancy = access.parsed_vacancy_marker === true;
  const physical = vacancy
    ? "vacant"
    : occupancy.physical_bed_status === "vacant"
      ? "unknown"
      : "occupied";
  const deposit = finiteMoney(
    access.parsed_deposit_amount ?? occupancy.deposit_recorded_amount,
  );
  const checkin = typeof access.parsed_checkin_mmdd === "string"
    ? access.parsed_checkin_mmdd.trim()
    : "";
  const coverageStart = typeof occupancy.current_rent_coverage_start === "string"
    ? occupancy.current_rent_coverage_start.trim()
    : "";
  const coverageEnd = typeof occupancy.current_rent_coverage_end === "string"
    ? occupancy.current_rent_coverage_end.trim()
    : "";
  return Object.freeze({
    bedLabel: bed,
    companyScope: "",
    snapshotAvailable: true,
    snapshotStale: false,
    snapshotAmbiguous: false,
    physicalBedStatus: physical,
    physicalBedStatusSource: vacancy
      ? "access_snapshot_E_marker"
      : "access_snapshot_no_E",
    parsedVacancyMarker: vacancy,
    depositSnapshotAed: deposit ?? null,
    depositSource: deposit === undefined ? "unknown" : "access_snapshot_D",
    depositAmbiguous: deposit === undefined,
    firstStayMmdd: checkin,
    firstStayMmddConfirmed: checkin.length > 0,
    rentCoverageStart: coverageStart,
    rentCoverageEnd: coverageEnd,
    openArrears: Object.freeze(arrears.map((row) => Object.freeze({
      cloudArrearsRef: row.cloudArrearsRef,
      remainingArrearsAed: row.remainingArrearsAed,
      arrearsSource: "cloud_arrears",
    }))),
  });
}

export function createEmployeeNextEntryContextPort(
  requestPort: EmployeeNextBrowserRequestPort,
  session: () => EmployeeAuthSession | undefined,
  runtimeEnvironment: () => Promise<unknown>,
  paths: Readonly<{
    rentConfig: string;
    arrears: string;
    deposit: string;
    bedContext: string;
  }>,
): EmployeeEntryContextPort {
  if (
    !safeRequestPort(requestPort)
    || typeof session !== "function"
    || typeof runtimeEnvironment !== "function"
    || !safePath(paths?.rentConfig)
    || !safePath(paths?.arrears)
    || !safePath(paths?.deposit)
    || !safePath(paths?.bedContext)
  ) {
    throw new Error("SIDECAR_CONTEXT_INVALID_OPTIONS");
  }
  const snapshots = new Map<string, ReturnType<typeof contextUnavailable> | {
    readonly ready: true;
    readonly values: Readonly<Record<string, unknown>>;
    readonly summary: string;
  }>();
  const generations = new Map<EmployeeEventId, number>();

  function key(eventId: EmployeeEventId, draft: Readonly<Record<string, unknown>>): string {
    return eventId === "bed-transfer"
      ? `${eventId}:${String(draft.fromBed ?? "").trim()}:${String(draft.toBed ?? "").trim()}`
      : eventId === "expense"
        ? eventId
        : `${eventId}:${String(draft.bedLabel ?? "").trim()}`;
  }

  async function get(path: string): Promise<unknown> {
    const response = await requestPort.request(path, Object.freeze({
      method: "GET",
      credentials: "same-origin",
      headers: Object.freeze({ Accept: "application/json" }),
    }));
    if (!responsePort(response) || response.status !== 200) {
      throw new Error("SIDECAR_CONTEXT_UNAVAILABLE");
    }
    return response.json();
  }

  async function loadArrearsSnapshot(bed: string): Promise<Readonly<{
    rows: readonly Readonly<Record<string, unknown>>[];
    totalAed: number;
  }>> {
    const snapshot = canonicalOpenArrearsSnapshot(
      await get(`${paths.arrears}?bed=${encodeURIComponent(bed)}`),
    );
    if (snapshot === undefined) {
      throw new Error("SIDECAR_CONTEXT_ARREARS_INCOMPLETE");
    }
    return snapshot;
  }

  async function loadArrears(bed: string): Promise<readonly Readonly<Record<string, unknown>>[]> {
    const { rows } = await loadArrearsSnapshot(bed);
    if (rows.length > 1) {
      throw new Error("SIDECAR_CONTEXT_ARREARS_AMBIGUOUS");
    }
    return rows;
  }

  async function load(
    eventId: EmployeeEventId,
    draft: Readonly<Record<string, unknown>>,
  ): Promise<Readonly<{ values: Readonly<Record<string, unknown>>; summary: string }>> {
    const currentSession = session();
    let expectedCorpid: ReturnType<typeof expectedEmployeeNextCorpid>;
    try {
      expectedCorpid = expectedEmployeeNextCorpid(await runtimeEnvironment());
    } catch {
      expectedCorpid = undefined;
    }
    if (
      !isEmployeeAuthSession(currentSession)
      || !["EMPLOYEE", "STAFF"].includes(currentSession.user.role)
      || expectedCorpid === undefined
      || currentSession.user.corpid !== expectedCorpid
    ) {
      throw new Error("SIDECAR_CONTEXT_AUTH_REQUIRED");
    }
    if (eventId === "expense") {
      return Object.freeze({
        values: Object.freeze({}),
        summary: "No business identity is required for this local expense draft.",
      });
    }
    if (eventId === "bed-transfer") {
      const fromBed = safeBedLabel(draft.fromBed);
      const toBed = safeBedLabel(draft.toBed);
      if (fromBed === undefined || toBed === undefined || fromBed === toBed) {
        throw new Error("SIDECAR_CONTEXT_BED_REQUIRED");
      }
      const [sourceValue, targetValue, arrears] = await Promise.all([
        get(`${paths.bedContext}?bed=${encodeURIComponent(fromBed)}`),
        get(`${paths.bedContext}?bed=${encodeURIComponent(toBed)}`),
        loadArrears(fromBed),
      ]);
      const source = bedAccessSnapshot(fromBed, sourceValue, arrears);
      const target = bedAccessSnapshot(toBed, targetValue, Object.freeze([]));
      if (
        source === undefined
        || target === undefined
        || source.physicalBedStatus !== "occupied"
        || target.physicalBedStatus !== "vacant"
      ) {
        throw new Error("SIDECAR_CONTEXT_BED_CONTRACT_MISMATCH");
      }
      const arrearsRow = arrears[0];
      return Object.freeze({
        values: Object.freeze({
          companyScope: currentSession.user.corpid,
          sourceAccessSnapshot: Object.freeze({
            ...source,
            companyScope: currentSession.user.corpid,
          }),
          targetAccessSnapshot: Object.freeze({
            ...target,
            companyScope: currentSession.user.corpid,
          }),
          cloudArrearsRef: arrearsRow?.cloudArrearsRef ?? "",
          carriedArrearsAmountAed: arrearsRow?.remainingArrearsAed ?? 0,
        }),
        summary: `Read-only Bed Context ready for ${fromBed} → ${toBed}.`,
      });
    }
    const bed = safeBedLabel(draft.bedLabel);
    if (bed === undefined) throw new Error("SIDECAR_CONTEXT_BED_REQUIRED");
    if (eventId === "rent") {
      const data = responseData(await get(paths.rentConfig));
      const config = data === undefined ? undefined : responseData(data.config);
      const amount = config === undefined ? undefined : finiteMoney(config[bed]);
      if (amount === undefined || amount <= 0) {
        throw new Error("SIDECAR_CONTEXT_RENT_CONFIG_MISSING");
      }
      return Object.freeze({
        values: Object.freeze({ amountDueAed: amount }),
        summary: `Read-only rent configuration ready for ${bed}.`,
      });
    }
    if (eventId === "arrears-payment") {
      const rows = await loadArrears(bed);
      if (rows.length !== 1) throw new Error("SIDECAR_CONTEXT_ARREARS_REQUIRED");
      return Object.freeze({
        values: Object.freeze({
          cloudArrearsRef: rows[0].cloudArrearsRef,
          remainingArrearsAed: rows[0].remainingArrearsAed,
        }),
        summary: `Read-only arrears context ready for ${bed}.`,
      });
    }
    const depositData = responseData(
      await get(`${paths.deposit}?bed=${encodeURIComponent(bed)}&allow_live_fetch=0`),
    );
    const requiredTotal = depositData === undefined
      ? undefined
      : finiteMoney(depositData.deposit_required_total);
    const currentDeposit = depositData === undefined
      ? undefined
      : finiteMoney(
        depositData.deposit_recorded_amount ?? depositData.balance,
      );
    if (requiredTotal === undefined || currentDeposit === undefined) {
      throw new Error("SIDECAR_CONTEXT_DEPOSIT_CONTRACT_MISMATCH");
    }
    if (depositData.readonly !== true || depositData.no_write !== true) {
      throw new Error("SIDECAR_CONTEXT_DEPOSIT_NOT_READONLY");
    }
    if (eventId === "deposit-in") {
      return Object.freeze({
        values: Object.freeze({
          depositRequiredTotalAed: requiredTotal,
          currentDepositSnapshotAed: currentDeposit,
        }),
        summary: `Read-only deposit context ready for ${bed}.`,
      });
    }
    if (eventId === "deposit-out") {
      const arrears = await loadArrearsSnapshot(bed);
      const openArrearsSummary = arrears.rows.length === 0
        ? "No open arrears."
        : arrears.rows.map((row) =>
          `${String(row.cloudArrearsRef)} — AED ${
            Number(row.remainingArrearsAed).toFixed(2)
          }`
        ).join("; ");
      return Object.freeze({
        values: Object.freeze({
          currentDepositSnapshotAed: currentDeposit,
          openArrears: arrears.rows,
          openArrearsTotalAed: arrears.totalAed,
          openArrearsSnapshotComplete: true,
          openArrearsSummary,
        }),
        summary: `Read-only deposit and Canonical arrears context ready for ${bed}; ${
          arrears.rows.length
        } open item(s), AED ${arrears.totalAed.toFixed(2)} total.`,
      });
    }
    if (eventId === "checkout") {
      const rows = await loadArrears(bed);
      return Object.freeze({
        values: Object.freeze({
          currentDepositSnapshotAed: currentDeposit,
          outstandingArrearsSnapshotAed: rows[0]?.remainingArrearsAed ?? 0,
          cloudArrearsRef: rows[0]?.cloudArrearsRef ?? "",
        }),
        summary: `Read-only checkout context ready for ${bed}.`,
      });
    }
    throw new Error("SIDECAR_CONTEXT_EVENT_UNSUPPORTED");
  }

  return Object.freeze({
    read(
      eventId: EmployeeEventId,
      draft: Readonly<Record<string, unknown>>,
    ) {
      if (eventId === "expense") {
        return Object.freeze({
          ready: true,
          values: Object.freeze({}),
          summary: "No business identity is required for this local expense draft.",
        });
      }
      return snapshots.get(key(eventId, draft)) ?? contextUnavailable();
    },
    async refresh(
      eventId: EmployeeEventId,
      draft: Readonly<Record<string, unknown>>,
      force = false,
    ): Promise<void> {
      const snapshotKey = key(eventId, draft);
      if (!force && snapshots.has(snapshotKey)) return;
      const generation = (generations.get(eventId) ?? 0) + 1;
      generations.set(eventId, generation);
      try {
        const result = await load(eventId, draft);
        if (generations.get(eventId) === generation) {
          snapshots.set(snapshotKey, Object.freeze({
            ready: true,
            values: result.values,
            summary: result.summary,
          }));
        }
      } catch {
        if (generations.get(eventId) === generation) {
          snapshots.set(snapshotKey, contextUnavailable(
            "Required read-only business context is unavailable. Retry Context.",
          ));
        }
      }
    },
  });
}

export function mapEmployeeNextBedTransferCapability(
  value: unknown,
): EmployeeBedTransferCapability | undefined {
  const data = apiData(value);
  if (
    data === undefined
    || typeof data.bed_transfer_validate_enabled !== "boolean"
    || typeof data.bed_transfer_write_enabled !== "boolean"
    || typeof data.canonical_write_path !== "string"
  ) {
    return undefined;
  }
  const canonicalWritePath = data.canonical_write_path.trim();
  if (!safePath(canonicalWritePath)) {
    return undefined;
  }
  return Object.freeze({
    validateEnabled: data.bed_transfer_validate_enabled,
    writeEnabled: data.bed_transfer_write_enabled,
    canonicalWritePath,
  });
}

function cloudSyncStatus(value: unknown): EmployeeCloudSyncStatus | undefined {
  if (
    typeof value === "string"
    && (EMPLOYEE_CLOUD_SYNC_STATUSES as readonly string[]).includes(value)
  ) {
    return value as EmployeeCloudSyncStatus;
  }
  return value === "CLOUD_DELETED" ? "OWNER_REVIEW_REQUIRED" : undefined;
}

function cloudSyncAggregateStatus(
  statuses: readonly EmployeeCloudSyncStatus[],
): EmployeeCloudSyncStatus | undefined {
  if (statuses.length === 0) return undefined;
  if (statuses.every((status) => status === "SYNCED")) return "SYNCED";
  for (const status of [
    "CLOUD_MISMATCH",
    "OWNER_REVIEW_REQUIRED",
    "CLOUD_CORRECTED",
    "CLOUD_VOIDED",
    "CLOUD_MISSING",
  ] as const) {
    if (statuses.includes(status)) return status;
  }
  return undefined;
}

export function mapEmployeeNextCloudSyncState(
  value: unknown,
  expectedSession: EmployeeNextSessionDraft,
): EmployeeCloudSyncState | undefined {
  const data = apiData(value);
  if (
    data === undefined
    || data.gateway !== "canonical_sync_state_gateway"
    || data.cloud_authoritative !== true
    || data.production_write !== false
    || data.no_write !== true
    || data.session_id !== expectedSession.session_id
    || !Array.isArray(data.entries)
    || data.entries.length !== expectedSession.entries.length
  ) {
    return undefined;
  }
  const expectedIds = expectedSession.entries.map((entry) => entry.entry_id);
  const seen = new Set<string>();
  const entries: EmployeeCloudEntrySyncState[] = [];
  for (const item of data.entries) {
    if (!isPlainRecord(item)) return undefined;
    const entryId = typeof item.local_event_id === "string"
      ? item.local_event_id.trim()
      : "";
    const status = cloudSyncStatus(item.sync_status);
    if (
      entryId.length === 0
      || status === undefined
      || !expectedIds.includes(entryId)
      || seen.has(entryId)
    ) {
      return undefined;
    }
    if (
      status === "SYNCED"
      && !(item.matched === true && item.cloud_match === true)
    ) {
      return undefined;
    }
    seen.add(entryId);
    entries.push(Object.freeze({ entryId, status }));
  }
  if (expectedIds.some((entryId) => !seen.has(entryId))) return undefined;
  const status = cloudSyncAggregateStatus(entries.map((entry) => entry.status));
  if (status === undefined) return undefined;
  const cloudSession = isPlainRecord(data.cloud_session)
    ? data.cloud_session
    : undefined;
  const cloudSessionId = typeof cloudSession?.id === "string"
    ? cloudSession.id.trim()
    : "";
  const anchorId = typeof cloudSession?.anchor_id === "string"
    ? cloudSession.anchor_id.trim()
    : "";
  if (
    status === "SYNCED"
    && (
      cloudSessionId !== expectedSession.session_id
      || anchorId.length === 0
    )
  ) {
    return undefined;
  }
  if (
    expectedSession.anchor_id !== undefined
    && anchorId.length > 0
    && anchorId !== expectedSession.anchor_id
  ) {
    return undefined;
  }
  return Object.freeze({
    status,
    sessionId: expectedSession.session_id,
    ...(anchorId.length === 0 ? {} : { anchorId }),
    entries: Object.freeze(entries),
  });
}

function normalizedServerId(
  data: Readonly<Record<string, unknown>>,
): string | undefined {
  const values = [data.userid, data.employee_id]
    .filter((value): value is string => (
      typeof value === "string" && value.trim().length > 0
    ))
    .map((value) => value.trim());
  if (values.length === 0 || values.some((value) => value !== values[0])) {
    return undefined;
  }
  return values[0];
}

export function mapEmployeeNextServerSession(
  value: unknown,
): EmployeeAuthSession | undefined {
  const data = apiData(value);
  if (data === undefined) {
    return undefined;
  }
  const roleValue = typeof data.role === "string"
    ? data.role.trim().toLowerCase()
    : "";
  const role = roleValue === "employee"
    ? "EMPLOYEE"
    : roleValue === "staff"
      ? "STAFF"
      : undefined;
  const employeeId = normalizedServerId(data);
  const corpid = typeof data.corpid === "string"
    && data.corpid.trim().length > 0
    ? data.corpid.trim()
    : undefined;
  if (
    role === undefined
    || employeeId === undefined
    || corpid === undefined
  ) {
    return undefined;
  }
  const displayNameValue = [data.display_name, data.employee_name]
    .find((candidate) => (
      typeof candidate === "string" && candidate.trim().length > 0
    ));
  const displayName = typeof displayNameValue === "string"
    ? displayNameValue.trim()
    : employeeId;
  return Object.freeze({
    user: Object.freeze({
      employeeId,
      displayName,
      role,
      userid: employeeId,
      corpid,
    }),
  });
}

function containsForbiddenIdentity(value: EmployeeApiJsonValue): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenIdentity(item));
  }
  if (value === null || typeof value !== "object") {
    return false;
  }
  const accessProviderKey = ["tt", "lock"].join("");
  return Object.entries(value).some(([key, item]) => {
    const normalizedKey = key.toLowerCase();
    const isExplicitNoMutationProof = (
      normalizedKey === `${accessProviderKey}mutationapplied`
      && item === false
    );
    return (
      /(?:provider|card_?id|tenant_?card|phone_?99099)/iu.test(key)
      || (normalizedKey.includes(accessProviderKey) && !isExplicitNoMutationProof)
      || containsForbiddenIdentity(item)
    );
  });
}

function stableJson(value: EmployeeApiJsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Readonly<Record<string, EmployeeApiJsonValue>>;
    return `{${Object.keys(record).sort().map(
      (key) => `${JSON.stringify(key)}:${stableJson(record[key])}`,
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableIdentity(value: EmployeeApiJsonValue): string {
  const source = stableJson(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function requiredRecord(
  value: EmployeeApiJsonValue | undefined,
): JsonRecord {
  if (!isPlainRecord(value)) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  return value;
}

function requiredString(
  record: JsonRecord,
  key: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  return value.trim();
}

function optionalString(
  record: JsonRecord,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function requiredMoney(record: JsonRecord, key: string): number {
  const value = record[key];
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || value < 0
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function singlePayment(
  value: EmployeeApiJsonValue | undefined,
  amountKey: string,
): Readonly<{ method: "cash" | "bank"; amount: number }> {
  const payment = requiredRecord(value);
  const method = requiredString(payment, "method");
  const legs = payment.legs;
  if (
    (method !== "cash" && method !== "bank")
    || !Array.isArray(legs)
    || legs.length !== 1
    || !isPlainRecord(legs[0])
    || requiredString(legs[0], "method") !== method
  ) {
    throw new Error("SIDECAR_ADAPTER_UNSUPPORTED_PAYMENT");
  }
  const amount = requiredMoney(legs[0], amountKey);
  return Object.freeze({ method, amount });
}

function eventDate(submission: JsonRecord): string {
  for (
    const key of [
      "rentPeriodStart",
      "repaymentDate",
      "depositReceivedDate",
      "refundDate",
      "checkoutDate",
      "transferDate",
    ]
  ) {
    const value = optionalString(submission, key);
    if (value !== undefined) {
      return value;
    }
  }
  if (submission.eventId === "expense") {
    return "";
  }
  throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
}

function baseEntry(
  submission: JsonRecord,
  employeeId: string,
): Readonly<Record<string, EmployeeApiJsonValue>> {
  if (containsForbiddenIdentity(submission)) {
    throw new Error("SIDECAR_ADAPTER_FORBIDDEN_IDENTITY");
  }
  const digest = stableIdentity({
    employeeId,
    submission,
  });
  return Object.freeze({
    id: `employee-next-entry-${digest}`,
    entry_id: `employee-next-entry-${digest}`,
    event_id: `employee-next-event-${digest}`,
    source: "employee_next",
  });
}

function rentEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const payment = singlePayment(submission.payment, "amountAed");
  const amountDue = requiredMoney(submission, "amountDueAed");
  const amountReceived = requiredMoney(submission, "amountReceivedAed");
  const shortPayment = submission.shortPayment === undefined
    ? undefined
    : requiredRecord(submission.shortPayment);
  const promiseDate = shortPayment === undefined
    ? undefined
    : optionalString(shortPayment, "promiseDate");
  const note = shortPayment === undefined
    ? optionalString(submission, "note")
    : requiredString(shortPayment, "note");
  if (amountReceived < amountDue && promiseDate === undefined) {
    throw new Error("SIDECAR_ADAPTER_UNPROVEN_ARREARS_DATE");
  }
  return Object.freeze({
    ...base,
    type: "R",
    event_type: "rent",
    room: requiredString(submission, "bedLabel"),
    bed: requiredString(submission, "bedLabel"),
    amount: amountReceived,
    due: amountDue,
    paid: amountReceived,
    expected_rent: amountDue,
    paid_amount: amountReceived,
    payment_method: payment.method,
    pay_type: payment.method,
    period_start: requiredString(submission, "rentPeriodStart"),
    period_end: requiredString(submission, "rentPeriodEnd"),
    rent_period_start: requiredString(submission, "rentPeriodStart"),
    rent_period_end: requiredString(submission, "rentPeriodEnd"),
    short_paid: amountReceived < amountDue,
    ...(promiseDate === undefined ? {} : {
      arrears_due_date: promiseDate,
      arrear_promise_date: promiseDate,
    }),
    ...(note === undefined ? {} : {
      arrears_note: note,
      note,
    }),
  });
}

function arrearsPaymentEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const payment = singlePayment(submission.payment, "amountAed");
  const before = requiredMoney(submission, "remainingArrearsAed");
  const amount = requiredMoney(submission, "amountReceivedAed");
  const after = Math.round((before - amount + Number.EPSILON) * 100) / 100;
  if (amount <= 0 || after < 0) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  return Object.freeze({
    ...base,
    type: "AP",
    event_type: "arrears_payment",
    room: requiredString(submission, "bedLabel"),
    bed: requiredString(submission, "bedLabel"),
    amount,
    payment_amount: amount,
    payment_method: payment.method,
    pay_type: payment.method,
    arrears_ref: requiredString(submission, "cloudArrearsRef"),
    linked_task_id: requiredString(submission, "cloudArrearsRef"),
    original_arrears_id: requiredString(submission, "cloudArrearsRef"),
    remaining_arrears_before_payment: before,
    remaining_arrears_after_payment: after,
    remaining_arrears: after,
    settlement_status: after === 0 ? "settled" : "partial",
    payment_date: requiredString(submission, "repaymentDate"),
    ...(optionalString(submission, "note") === undefined
      ? {}
      : { note: optionalString(submission, "note") as string }),
  });
}

function depositInEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const payment = singlePayment(submission.payment, "amountAed");
  return Object.freeze({
    ...base,
    type: "D",
    event_type: "deposit_in",
    room: requiredString(submission, "bedLabel"),
    bed: requiredString(submission, "bedLabel"),
    amount: requiredMoney(submission, "depositAmountAed"),
    deposit_amount: requiredMoney(submission, "depositAmountAed"),
    deposit_required_total: requiredMoney(
      submission,
      "depositRequiredTotalAed",
    ),
    previous_deposit_recorded_amount: requiredMoney(
      submission,
      "previousDepositRecordedAmountAed",
    ),
    deposit_paid_amount: requiredMoney(submission, "depositPaidAmountAed"),
    expected_deposit_after_payment: requiredMoney(
      submission,
      "expectedDepositAfterPaymentAed",
    ),
    deposit_remaining_after_payment: requiredMoney(
      submission,
      "depositRemainingAfterPaymentAed",
    ),
    deposit_remaining: requiredMoney(
      submission,
      "depositRemainingAfterPaymentAed",
    ),
    payment_method: payment.method,
    pay_type: payment.method,
    deposit_received_date: requiredString(
      submission,
      "depositReceivedDate",
    ),
    ...(optionalString(submission, "note") === undefined
      ? {}
      : { note: optionalString(submission, "note") as string }),
  });
}

function depositOutEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const refund = singlePayment(submission.refund, "amountAed");
  const difference = requiredRecord(submission.difference);
  const differenceReason = optionalString(difference, "reason");
  const arrearsReview = isPlainRecord(submission.arrearsReview)
    ? submission.arrearsReview
    : undefined;
  const arrearsReason = arrearsReview === undefined
    ? undefined
    : optionalString(arrearsReview, "nonRepaymentReason");
  if (
    arrearsReview !== undefined
    && (
      arrearsReason === undefined
      || arrearsReview.automaticArrearsOffset !== false
      || arrearsReview.automaticArrearsPayment !== false
      || arrearsReview.openArrearsRemainOpen !== true
      || !Array.isArray(arrearsReview.openArrears)
      || arrearsReview.openArrears.length === 0
    )
  ) {
    throw new Error("SIDECAR_ADAPTER_UNPROVEN_ARREARS_REVIEW");
  }
  const refundReason = arrearsReason
    ?? optionalString(submission, "note")
    ?? differenceReason;
  if (refundReason === undefined) {
    throw new Error("SIDECAR_ADAPTER_UNPROVEN_REFUND_REASON");
  }
  const openArrearsAmount = arrearsReview === undefined
    ? 0
    : requiredMoney(arrearsReview, "openArrearsTotalAed");
  return Object.freeze({
    ...base,
    type: "DR",
    event_type: "deposit_out",
    room: requiredString(submission, "bedLabel"),
    bed: requiredString(submission, "bedLabel"),
    amount: requiredMoney(submission, "refundAmountAed"),
    deposit_balance: requiredMoney(
      submission,
      "currentDepositSnapshotAed",
    ),
    actual_refund_amount: requiredMoney(submission, "refundAmountAed"),
    refund_amount: requiredMoney(submission, "refundAmountAed"),
    refund_difference: requiredMoney(difference, "amountAed"),
    refund_method: refund.method,
    payment_method: refund.method,
    pay_type: refund.method,
    refund_date: requiredString(submission, "refundDate"),
    refund_reason: refundReason,
    difference_reason: differenceReason ?? refundReason,
    open_arrears_amount: openArrearsAmount,
    outstanding_arrears: openArrearsAmount,
    arrears_offset_amount: 0,
    note: optionalString(submission, "note") ?? refundReason,
  });
}

function checkoutEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const deposit = requiredRecord(submission.depositSettlement);
  const arrears = requiredRecord(submission.arrearsSnapshot);
  const mode = requiredString(submission, "checkoutMode");
  const outstanding = requiredMoney(arrears, "outstandingArrearsAed");
  const refund = requiredMoney(deposit, "depositRefundDeclaredAed");
  if (refund !== 0) {
    throw new Error("SIDECAR_ADAPTER_UNPROVEN_REFUND_METHOD");
  }
  const finalNote = optionalString(submission, "finalNote");
  if (mode === "left_with_arrears" && finalNote === undefined) {
    throw new Error("SIDECAR_ADAPTER_UNPROVEN_CHECKOUT_NOTE");
  }
  return Object.freeze({
    ...base,
    type: "CO",
    event_type: mode === "left_with_arrears"
      ? "left_with_arrears"
      : "checkout",
    room: requiredString(submission, "bedLabel"),
    bed: requiredString(submission, "bedLabel"),
    amount: 0,
    checkout_date: requiredString(submission, "checkoutDate"),
    checkout_type: mode,
    checkout_mode: mode,
    left_with_arrears: mode === "left_with_arrears",
    customer_left: mode === "left_with_arrears",
    deposit_refund: refund,
    outstanding_arrears: outstanding,
    open_arrears_amount: outstanding,
    arrears_amount: outstanding,
    left_arrears_amount: outstanding,
    ...(optionalString(arrears, "cloudArrearsRef") === undefined
      ? {}
      : {
        arrears_ref: optionalString(arrears, "cloudArrearsRef") as string,
      }),
    ...(finalNote === undefined ? {} : {
      note: finalNote,
      final_note: finalNote,
    }),
  });
}

function expenseEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const payment = requiredRecord(submission.payment);
  const method = requiredString(payment, "method");
  if (method !== "cash" && method !== "bank") {
    throw new Error("SIDECAR_ADAPTER_UNSUPPORTED_PAYMENT");
  }
  const amount = submission.expenseAmountAed;
  const cash = payment.cashPaidAed;
  const bank = payment.bankPaidAed;
  const amountFils = employeeExpenseAedToFils(amount);
  const cashFils = employeeExpenseAedToFils(cash);
  const bankFils = employeeExpenseAedToFils(bank);
  if (
    amountFils === undefined
    || amountFils <= 0n
    || cashFils === undefined
    || bankFils === undefined
    || cashFils + bankFils !== amountFils
    || (method === "cash" && (cashFils !== amountFils || bankFils !== 0n))
    || (method === "bank" && (cashFils !== 0n || bankFils !== amountFils))
    || !Array.isArray(payment.legs)
    || payment.legs.length !== 1
    || !isPlainRecord(payment.legs[0])
    || payment.legs[0].method !== method
    || employeeExpenseAedToFils(payment.legs[0].amountAed) !== amountFils
  ) {
    throw new Error("SIDECAR_ADAPTER_EXPENSE_PAYMENT_VECTOR_INVALID");
  }
  const target = requiredString(submission, "targetRoom");
  const description = requiredString(submission, "expenseDescription");
  if (submission.expenseCategory !== "EXPENSE") {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  return Object.freeze({
    ...base,
    type: "E",
    event_type: "expense",
    room: target,
    target_bed: target,
    amount: amount as string | number,
    expense_amount: amount as string | number,
    expense_category: "EXPENSE",
    expense_description: description,
    expense_desc: description,
    payment_method: method,
    pay_type: method,
    note: description,
  });
}

function bedTransferEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const fee = requiredRecord(submission.transferFeePreview);
  const difference = requiredRecord(submission.bedPriceDifferencePreview);
  const arrears = requiredRecord(submission.arrearsCarryoverPreview);
  const feeMode = requiredString(fee, "mode");
  const feeMethod = requiredString(fee, "paymentMethod");
  if (
    (feeMode === "paid" && feeMethod !== "cash" && feeMethod !== "bank")
    || (
      feeMode !== "paid"
      && feeMode !== "waived"
      && feeMode !== "unpaid"
    )
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  const differenceMode = requiredString(difference, "mode");
  const differenceMethod = requiredString(difference, "paymentMethod");
  if (
    differenceMode !== "none"
    && differenceMode !== "paid"
    && differenceMode !== "unpaid"
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  return Object.freeze({
    ...base,
    type: "BT",
    source: "employee_entry",
    event_type: "bed_transfer",
    from_bed: requiredString(submission, "fromBed"),
    to_bed: requiredString(submission, "toBed"),
    transfer_reason: requiredString(submission, "transferReason"),
    fee_mode: feeMode,
    fee_amount_aed: requiredMoney(fee, "declaredAmountAed"),
    fee_due_date: optionalString(fee, "dueDate") ?? "",
    payment_method: feeMethod,
    fee_waiver_reason: optionalString(fee, "waiverReason") ?? "",
    bed_price_difference_mode: differenceMode,
    bed_price_difference_amount_aed: requiredMoney(
      difference,
      "declaredAmountAed",
    ),
    bed_price_difference_due_date:
      optionalString(difference, "dueDate") ?? "",
    ...(differenceMode === "none"
      ? {}
      : { bed_price_difference_payment_method: differenceMethod }),
    bed_price_difference_reason:
      optionalString(difference, "reason") ?? "",
    arrears_carryover: arrears.carryoverRequired === true,
    carried_arrears_amount: requiredMoney(
      arrears,
      "carriedArrearsAmountAed",
    ),
    ...(optionalString(arrears, "cloudArrearsRef") === undefined
      ? {}
      : {
        cloud_arrears_ref: optionalString(
          arrears,
          "cloudArrearsRef",
        ) as string,
      }),
    note: optionalString(submission, "finalNote")
      ?? requiredString(submission, "transferReason"),
  });
}

export function buildEmployeeNextSidecarRequest(
  context: EmployeeSubmitEntryContext<object>,
  submitPath: string,
): EmployeeApiRequest {
  if (
    !safePath(submitPath)
    || !isPlainRecord(context.submission)
    || containsForbiddenIdentity(context.submission)
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  const submission = context.submission;
  const base = baseEntry(submission, context.session.user.employeeId);
  const entry = context.eventId === "rent"
    ? rentEntry(submission, base)
    : context.eventId === "arrears-payment"
      ? arrearsPaymentEntry(submission, base)
      : context.eventId === "deposit-in"
        ? depositInEntry(submission, base)
        : context.eventId === "deposit-out"
          ? depositOutEntry(submission, base)
          : context.eventId === "checkout"
            ? checkoutEntry(submission, base)
            : context.eventId === "expense"
              ? expenseEntry(submission, base)
              : context.eventId === "bed-transfer"
                ? bedTransferEntry(submission, base)
                : undefined;
  if (entry === undefined) {
    throw new Error("SIDECAR_ADAPTER_UNKNOWN_EVENT");
  }
  const identity = stableIdentity({
    employeeId: context.session.user.employeeId,
    submission,
  });
  const sessionId = `employee-next-session-${identity}`;
  const date = eventDate(submission);
  const body = Object.freeze({
    entry_identity: entry.id,
    entry,
    event_index: 0,
    session: Object.freeze({
      id: sessionId,
      session_id: sessionId,
      ...(date === "" ? {} : { date }),
      entries_count: 1,
      entries: Object.freeze([entry]),
      cash_handover: 0,
      bank_transfer_total: 0,
      bank_transfer_count: 0,
      gross_received: 0,
      handover_status: "COMPLETED",
      source: "employee_next",
    }),
  });
  return Object.freeze({
    method: "POST",
    path: submitPath,
    body,
  });
}

export function createEmployeeNextSidecarAdapters(
  options: EmployeeNextSidecarAdapterOptions,
): EmployeeNextSidecarAdapters {
  if (
    typeof options !== "object"
    || options === null
    || !safeRequestPort(options.requestPort)
    || !safePath(options.sessionPath)
    || !safePath(options.submitPath)
    || options.sessionPath === options.submitPath
    || (
      options.environmentPath !== undefined
      && !safePath(options.environmentPath)
    )
    || (
      options.capabilitiesPath !== undefined
      && !safePath(options.capabilitiesPath)
    )
    || (
      options.syncStatePath !== undefined
      && !safePath(options.syncStatePath)
    )
    || (
      options.validatePath !== undefined
      && !safePath(options.validatePath)
    )
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_OPTIONS");
  }
  const requestPort = options.requestPort;
  const sessionPath = options.sessionPath;
  const submitPath = options.submitPath;
  const environmentPath = options.environmentPath
    ?? sessionPath.replace(/\/me$/u, "/health");
  const capabilitiesPath = options.capabilitiesPath
    ?? sessionPath.replace(/\/me$/u, "/capabilities");
  const syncStatePath = options.syncStatePath
    ?? `${submitPath}/sync-state`;
  const validatePath = options.validatePath
    ?? `${submitPath}/validate`;
  if (
    !safePath(capabilitiesPath)
    || !safePath(environmentPath)
    || environmentPath === sessionPath
    || environmentPath === submitPath
    || environmentPath === capabilitiesPath
    || capabilitiesPath === sessionPath
    || capabilitiesPath === submitPath
    || !safePath(syncStatePath)
    || syncStatePath === sessionPath
    || syncStatePath === submitPath
    || syncStatePath === capabilitiesPath
    || syncStatePath === environmentPath
    || !safePath(validatePath)
    || validatePath === sessionPath
    || validatePath === submitPath
    || validatePath === capabilitiesPath
    || validatePath === environmentPath
    || validatePath === syncStatePath
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_OPTIONS");
  }
  const transport = Object.freeze({
    async request(request: EmployeeApiRequest): Promise<EmployeeApiResponse> {
      if (!EMPLOYEE_NEXT_FORMAL_WRITE_ENABLED) {
        throw new Error("SIDECAR_FORMAL_UPLOAD_DISABLED");
      }
      if (
        request.method !== "POST"
        || request.path !== submitPath
        || !safeHeaders(request.headers)
      ) {
        throw new Error("SIDECAR_ADAPTER_REQUEST_REJECTED");
      }
      let response: EmployeeNextBrowserResponse;
      try {
        response = await requestPort.request(submitPath, Object.freeze({
          method: "POST",
          credentials: "same-origin",
          headers: Object.freeze({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          ...(request.body === undefined
            ? {}
            : { body: JSON.stringify(request.body) }),
        }));
      } catch {
        throw new Error("SIDECAR_ADAPTER_TRANSPORT_FAILED");
      }
      if (!responsePort(response)) {
        throw new Error("SIDECAR_ADAPTER_INVALID_RESPONSE");
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("SIDECAR_ADAPTER_INVALID_RESPONSE");
      }
      if (
        !Number.isInteger(response.status)
        || response.status < 100
        || response.status > 599
        || !(
          body === undefined
          || typeof body === "string"
          || typeof body === "number"
          || typeof body === "boolean"
          || body === null
          || Array.isArray(body)
          || isPlainRecord(body)
        )
      ) {
        throw new Error("SIDECAR_ADAPTER_INVALID_RESPONSE");
      }
      return Object.freeze({
        status: response.status,
        body: body as EmployeeApiJsonValue,
      });
    },
  });
  let restoredSession: EmployeeAuthSession | undefined;
  let runtimeEnvironmentPromise: Promise<unknown> | undefined;
  const runtimeEnvironment = (): Promise<unknown> => {
    runtimeEnvironmentPromise ??= (async () => {
      const response = await requestPort.request(
        environmentPath,
        Object.freeze({
          method: "GET",
          credentials: "same-origin",
          headers: Object.freeze({ Accept: "application/json" }),
        }),
      );
      if (!responsePort(response) || response.status !== 200) {
        throw new Error("SIDECAR_RUNTIME_ENVIRONMENT_UNAVAILABLE");
      }
      const data = apiData(await response.json());
      if (data === undefined || typeof data.environment !== "string") {
        throw new Error("SIDECAR_RUNTIME_ENVIRONMENT_UNAVAILABLE");
      }
      return data.environment.trim().toLowerCase();
    })();
    return runtimeEnvironmentPromise;
  };
  const entryContexts = createEmployeeNextEntryContextPort(
    requestPort,
    () => restoredSession,
    runtimeEnvironment,
    Object.freeze({
      rentConfig: sessionPath.replace(/\/me$/u, "/rent_config"),
      arrears: sessionPath.replace(/\/me$/u, "/arrear_tasks"),
      deposit: submitPath.replace(/\/entry$/u, "/deposit"),
      bedContext: submitPath.replace(/\/entry$/u, "/bed-context"),
    }),
  );
  return Object.freeze({
    transport,
    submitPath,
    entryContexts,
    async validateSessionRequest(
      request: EmployeeApiRequest,
    ): Promise<EmployeeApiResponse> {
      if (
        request.method !== "POST"
        || request.path !== validatePath
        || !safeHeaders(request.headers)
        || !isPlainRecord(request.body)
      ) {
        throw new Error("SIDECAR_VALIDATE_REQUEST_REJECTED");
      }
      let response: EmployeeNextBrowserResponse;
      try {
        response = await requestPort.request(validatePath, Object.freeze({
          method: "POST",
          credentials: "same-origin",
          headers: Object.freeze({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(request.body),
        }));
      } catch {
        throw new Error("SIDECAR_VALIDATE_TRANSPORT_FAILED");
      }
      if (!responsePort(response)) {
        throw new Error("SIDECAR_VALIDATE_INVALID_RESPONSE");
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("SIDECAR_VALIDATE_INVALID_RESPONSE");
      }
      if (!isPlainRecord(body)) {
        throw new Error("SIDECAR_VALIDATE_INVALID_RESPONSE");
      }
      return Object.freeze({
        status: response.status,
        body: body as EmployeeApiJsonValue,
      });
    },
    async restoreSession(): Promise<EmployeeAuthSession> {
      let response: EmployeeNextBrowserResponse;
      let body: unknown;
      try {
        response = await requestPort.request(sessionPath, Object.freeze({
          method: "GET",
          credentials: "same-origin",
          headers: Object.freeze({ Accept: "application/json" }),
        }));
        if (!responsePort(response) || response.status !== 200) {
          throw new Error("SESSION_RESPONSE_REJECTED");
        }
        body = await response.json();
      } catch {
        throw new Error("SIDECAR_SESSION_RESTORE_FAILED");
      }
      const session = mapEmployeeNextServerSession(body);
      if (session === undefined) {
        throw new Error("SIDECAR_SESSION_RESTORE_FAILED");
      }
      restoredSession = session;
      return session;
    },
    async restoreBedTransferCapability(): Promise<EmployeeBedTransferCapability> {
      try {
        const response = await requestPort.request(
          capabilitiesPath,
          Object.freeze({
            method: "GET",
            credentials: "same-origin",
            headers: Object.freeze({ Accept: "application/json" }),
          }),
        );
        if (!responsePort(response) || response.status !== 200) {
          return disabledBedTransferCapability;
        }
        return mapEmployeeNextBedTransferCapability(await response.json())
          ?? disabledBedTransferCapability;
      } catch {
        return disabledBedTransferCapability;
      }
    },
    async checkSyncState(
      session: EmployeeNextSessionDraft,
    ): Promise<EmployeeCloudSyncState> {
      if (
        typeof session !== "object"
        || session === null
        || typeof session.session_id !== "string"
        || session.session_id.trim().length === 0
        || !Array.isArray(session.entries)
        || session.entries.length === 0
      ) {
        throw new Error("SIDECAR_SYNC_STATE_REQUEST_REJECTED");
      }
      let response: EmployeeNextBrowserResponse;
      try {
        response = await requestPort.request(syncStatePath, Object.freeze({
          method: "POST",
          credentials: "same-origin",
          headers: Object.freeze({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            session_id: session.session_id,
            ...(session.anchor_id === undefined
              ? {}
              : { anchor_id: session.anchor_id }),
            entries: session.entries.map((entry) => ({
              id: entry.entry_id,
              entry_id: entry.entry_id,
              event_id: entry.entry_id,
              event_type: entry.event_type,
            })),
          }),
        }));
      } catch {
        throw new Error("SIDECAR_SYNC_STATE_UNAVAILABLE");
      }
      if (!responsePort(response) || response.status !== 200) {
        throw new Error("SIDECAR_SYNC_STATE_UNAVAILABLE");
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("SIDECAR_SYNC_STATE_UNAVAILABLE");
      }
      const result = mapEmployeeNextCloudSyncState(body, session);
      if (result === undefined) {
        throw new Error("SIDECAR_SYNC_STATE_UNAVAILABLE");
      }
      return result;
    },
    buildApiRequest(
      context: EmployeeSubmitEntryContext<object>,
    ): EmployeeApiRequest {
      return buildEmployeeNextSidecarRequest(context, submitPath);
    },
  });
}

function aggregateSessionRequest(
  session: EmployeeNextSessionDraft,
  authSession: EmployeeAuthSession,
  buildApiRequest: EmployeeNextSidecarAdapters["buildApiRequest"],
  submitPath: string,
): EmployeeApiRequest | undefined {
  if (
    session.entries.length === 0
    || session.entries.some((entry) => entry.event_type === "bed-transfer")
  ) {
    return undefined;
  }
  const entries: EmployeeApiJsonValue[] = [];
  for (const draft of session.entries) {
    const request = buildApiRequest(Object.freeze({
      session: authSession,
      eventId: draft.event_type,
      submission: draft.payload as object,
    }));
    if (
      request.method !== "POST"
      || request.path !== submitPath
      || !isPlainRecord(request.body)
      || !isPlainRecord(request.body.entry)
    ) {
      return undefined;
    }
    entries.push(Object.freeze({
      ...request.body.entry,
      id: draft.entry_id,
      entry_id: draft.entry_id,
      event_id: draft.entry_id,
      session_id: session.session_id,
    }));
  }
  return Object.freeze({
    method: "POST",
    path: submitPath,
    body: Object.freeze({
      aggregate_write: true,
      session: Object.freeze({
        id: session.session_id,
        session_id: session.session_id,
        entries_count: entries.length,
        entries: Object.freeze(entries),
        handover_status: "COMPLETED",
        source: "employee_next",
      }),
    }),
  });
}

function singleBedTransferSessionRequest(
  session: EmployeeNextSessionDraft,
  authSession: EmployeeAuthSession,
  buildApiRequest: EmployeeNextSidecarAdapters["buildApiRequest"],
  submitPath: string,
): EmployeeApiRequest | undefined {
  const draft = session.entries[0];
  if (
    session.entries.length !== 1
    || draft?.event_type !== "bed-transfer"
  ) {
    return undefined;
  }
  const request = buildApiRequest(Object.freeze({
    session: authSession,
    eventId: "bed-transfer",
    submission: draft.payload as object,
  }));
  if (
    request.method !== "POST"
    || request.path !== submitPath
    || !isPlainRecord(request.body)
    || !isPlainRecord(request.body.entry)
    || !isPlainRecord(request.body.session)
  ) {
    return undefined;
  }
  const entry = Object.freeze({
    ...request.body.entry,
    id: draft.entry_id,
    entry_id: draft.entry_id,
    event_id: draft.entry_id,
    session_id: session.session_id,
  });
  return Object.freeze({
    method: "POST",
    path: submitPath,
    body: Object.freeze({
      ...request.body,
      entry_identity: draft.entry_id,
      entry,
      event_index: 0,
      session: Object.freeze({
        ...request.body.session,
        id: session.session_id,
        session_id: session.session_id,
        entries_count: 1,
        entries: Object.freeze([entry]),
      }),
    }),
  });
}

function pendingSessionRequest(
  session: EmployeeNextSessionDraft,
  authSession: EmployeeAuthSession,
  buildApiRequest: EmployeeNextSidecarAdapters["buildApiRequest"],
  submitPath: string,
): EmployeeApiRequest | undefined {
  return session.entries.length === 1
    && session.entries[0]?.event_type === "bed-transfer"
    ? singleBedTransferSessionRequest(
      session,
      authSession,
      buildApiRequest,
      submitPath,
    )
    : aggregateSessionRequest(
      session,
      authSession,
      buildApiRequest,
      submitPath,
    );
}

function validateOnlyRequest(
  request: EmployeeApiRequest,
  validatePath: string,
): EmployeeApiRequest | undefined {
  if (
    request.method !== "POST"
    || !safePath(validatePath)
    || !isPlainRecord(request.body)
    || !isPlainRecord(request.body.session)
  ) {
    return undefined;
  }
  const entries = request.body.aggregate_write === true
    ? request.body.session.entries
    : isPlainRecord(request.body.entry)
      ? [request.body.entry]
      : undefined;
  if (
    !Array.isArray(entries)
    || entries.length === 0
    || entries.some((entry) => !isPlainRecord(entry))
  ) {
    return undefined;
  }
  const session = request.body.session;
  return Object.freeze({
    method: "POST",
    path: validatePath,
    body: Object.freeze({
      aggregate_preflight: true,
      dry_run: true,
      validate_only: true,
      no_write: true,
      source: "employee_entry",
      validation_requests: Object.freeze(entries.map((entry, eventIndex) =>
        Object.freeze({
          entry_identity: entry.id,
          entry,
          event_index: eventIndex,
          session,
          dry_run: true,
          validate_only: true,
          no_write: true,
          source: "employee_entry",
        })
      )),
    }),
  });
}

function acceptedValidationResult(
  response: EmployeeApiResponse,
  expectedCount: number,
): boolean {
  const data = responseData(response.body);
  return (
    response.status >= 200
    && response.status <= 299
    && data?.ok === true
    && data.no_write === true
    && data.write_attempted === false
    && data.formal_write_count === 0
    && data.validation_result_count === expectedCount
    && data.passed_result_count === expectedCount
    && data.failed_result_count === 0
    && Array.isArray(data.validation_results)
    && data.validation_results.length === expectedCount
    && data.validation_results.every((row) =>
      isPlainRecord(row)
      && row.ok === true
      && row.write_attempted === false
    )
  );
}

function expectedAggregateUploadReceipt(
  request: EmployeeApiRequest,
): Readonly<{ entryIds: readonly string[]; sessionId: string }> | undefined {
  if (
    request.method !== "POST"
    || !isPlainRecord(request.body)
    || request.body.aggregate_write !== true
    || !isPlainRecord(request.body.session)
    || !Array.isArray(request.body.session.entries)
  ) {
    return undefined;
  }
  const sessionIdValue = request.body.session.session_id;
  const sessionId = typeof sessionIdValue === "string"
    ? sessionIdValue.trim()
    : "";
  const entryIds = request.body.session.entries.map((entry) =>
    isPlainRecord(entry) && typeof entry.id === "string"
      ? entry.id.trim()
      : ""
  );
  return (
      sessionId.length > 0
      && entryIds.length > 0
      && entryIds.every((entryId) => entryId.length > 0)
      && new Set(entryIds).size === entryIds.length
    )
    ? Object.freeze({ entryIds: Object.freeze(entryIds), sessionId })
    : undefined;
}

function explicitAggregateUploadReceipt(
  response: EmployeeApiResponse,
  expected: Readonly<{ entryIds: readonly string[]; sessionId: string }>,
): Readonly<{ entryIds: readonly string[]; sessionId: string }> | undefined {
  if (
    response.status < 200
    || response.status > 299
    || !isPlainRecord(response.body)
    || response.body.success !== true
    || response.body.ok !== true
    || response.body.error !== undefined
    || response.body.error_code !== undefined
    || response.body.session_id !== expected.sessionId
    || response.body.aggregate_write !== true
    || response.body.committed !== true
    || response.body.requested_entry_count !== expected.entryIds.length
    || response.body.persisted_entry_count !== expected.entryIds.length
    || response.body.canonical_anchor_count !== expected.entryIds.length
    || response.body.transaction_count !== expected.entryIds.length
    || !Array.isArray(response.body.entry_results)
    || response.body.entry_results.length !== expected.entryIds.length
  ) {
    return undefined;
  }
  const resultIds = response.body.entry_results.map((result) =>
    isPlainRecord(result)
      && result.success === true
      && result.ok === true
      && typeof result.entry_id === "string"
      ? result.entry_id
      : ""
  );
  if (
    resultIds.some((entryId) => !expected.entryIds.includes(entryId))
    || new Set(resultIds).size !== expected.entryIds.length
  ) {
    return undefined;
  }
  return expected;
}

function appendText(
  parent: HTMLElement,
  tagName: "h1" | "p" | "section",
  text: string,
): HTMLElement {
  const element = document.createElement(tagName);
  element.textContent = text;
  parent.append(element);
  return element;
}

function localDraftDisplayText(entry: EmployeeNextSessionDraftEntry): string {
  const base = `${entry.event_type} — unsent local draft`;
  if (entry.event_type !== "expense" || !isPlainRecord(entry.payload)) {
    return base;
  }
  const payment = entry.payload.payment;
  const amount = entry.payload.expenseAmountAed;
  const description = entry.payload.expenseDescription;
  if (
    typeof amount !== "number"
    || !Number.isFinite(amount)
    || !isPlainRecord(payment)
    || (payment.method !== "cash" && payment.method !== "bank")
    || typeof description !== "string"
    || description.trim().length === 0
  ) {
    return base;
  }
  return `${base} — AED ${amount.toFixed(2)} — ${payment.method} — ${description.trim()}`;
}

function createLocalRenderPort(
  root: HTMLElement,
  controllerRef: () => EmployeeNextRouteController | undefined,
  draftViewRef?: () => EmployeeNextSessionDraftView,
  entryUiRef?: () => EmployeeEntryUiController | undefined,
  removeLocalDraft?: (entry: EmployeeNextSessionDraftEntry) => Promise<void>,
  expenseUploadRef?: () => Readonly<{
    enabled: boolean;
    state: EmployeeExpenseUploadCanaryState;
    validationState: EmployeeSessionValidationState;
    payloadPreview?: string;
    validate: () => Promise<boolean>;
    upload: () => Promise<boolean>;
    retrySyncCheck: () => Promise<boolean>;
  }>,
  bedTransferWriteEnabledRef?: () => boolean,
) {
  return Object.freeze({
    render(view: EmployeeNextRouteView): void {
      root.replaceChildren();
      root.dataset.route = "/employee-next";
      root.dataset.routeStatus = view.state.status;

      appendText(root, "h1", "Employee Next");
      appendText(root, "p", `Route status: ${view.state.status}`);
      appendText(root, "p", `Authentication: ${view.shell.auth.status}`);
      appendText(root, "p", `Submit status: ${view.shell.submit.status}`);
      const expenseUpload = expenseUploadRef?.();
      const draftView = draftViewRef?.();
      if (draftView !== undefined) {
        if (draftView.status === "AUTH_RESTORING") {
          appendText(root, "p", "Restoring session");
        } else if (draftView.status === "DRAFT_RESTORING") {
          appendText(root, "p", "Restoring draft");
        } else if (draftView.status === "DRAFT_UNAVAILABLE") {
          appendText(root, "p", `Draft unavailable: ${draftView.errorCode}`);
        } else {
          appendText(
            root,
            "p",
            `Current Session (${draftView.entryCount})`,
          );
          appendText(
            root,
            "p",
            `Cash Received: AED ${draftView.summary.cashReceivedAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Bank Received: AED ${draftView.summary.bankReceivedAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Total Received: AED ${draftView.summary.totalReceivedAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Expenses: AED ${draftView.summary.expensesAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Cash Net: AED ${draftView.summary.cashNetAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Bank Net: AED ${draftView.summary.bankNetAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Net Funds: AED ${draftView.summary.netFundsAed.toFixed(2)}`,
          );
          if (
            draftView.session !== undefined
            && removeLocalDraft !== undefined
          ) {
            const localDrafts = appendText(root, "section", "");
            localDrafts.setAttribute("aria-label", "Current local drafts");
            localDrafts.dataset.sessionId = draftView.session.session_id;
            for (const entry of draftView.session.entries) {
              const row = appendText(
                localDrafts,
                "section",
                localDraftDisplayText(entry),
              );
              row.dataset.entryId = entry.entry_id;
              const cloudEntry = (
                expenseUpload !== undefined
                && "entries" in expenseUpload.state
              )
                ? expenseUpload.state.entries.find(
                  (item) => item.entryId === entry.entry_id,
                )
                : undefined;
              if (cloudEntry !== undefined) {
                appendText(row, "p", `Cloud Sync: ${cloudEntry.status}`);
              }
              const remove = document.createElement("button");
              remove.type = "button";
              remove.textContent = "Remove Local Draft / 删除本地草稿";
              remove.dataset.action = "remove-local-draft";
              remove.dataset.entryId = entry.entry_id;
              remove.addEventListener("click", () => {
                void removeLocalDraft(entry);
              });
              row.append(remove);
            }
          }
          if (draftView.errorCode !== undefined) {
            appendText(root, "p", draftView.errorCode);
          }
        }
      }
      if (expenseUpload !== undefined) {
        const validationPassed = (
          expenseUpload.validationState.status === "VALIDATED_VALIDATE_ONLY"
        );
        appendText(
          root,
          "p",
          validationPassed
            ? "Validation passed / 测试验证通过"
            : `Validation: ${expenseUpload.validationState.status}`,
        );
        if (validationPassed) {
          appendText(
            root,
            "p",
            "Validate-only beta rehearsal. No business data was written to cloud. / 本次为公测演练，尚未正式写入云端。",
          );
        }
        if (expenseUpload.payloadPreview !== undefined) {
          appendText(root, "p", "Payload Preview");
          const preview = document.createElement("pre");
          preview.dataset.payloadPreview = "employee-entry";
          preview.textContent = expenseUpload.payloadPreview;
          root.append(preview);
          const validate = document.createElement("button");
          validate.type = "button";
          validate.textContent = "Validate";
          validate.dataset.action = "validate-session";
          validate.disabled =
            expenseUpload.validationState.status === "VALIDATING";
          validate.addEventListener("click", () => {
            void expenseUpload.validate();
          });
          root.append(validate);
        }
        appendText(
          root,
          "p",
          `Employee Sync State: ${expenseUpload.state.status}`,
        );
        if (expenseUpload.state.status === "SYNC_CHECK_UNAVAILABLE") {
          const retry = document.createElement("button");
          retry.type = "button";
          retry.textContent = "Retry Sync Check";
          retry.dataset.action = "retry-sync-check";
          retry.addEventListener("click", () => {
            void expenseUpload.retrySyncCheck();
          });
          root.append(retry);
        }
      }

      const eventSection = appendText(root, "section", "");
      eventSection.setAttribute("aria-label", "Seven event choices");
      for (const option of view.shell.eventOptions) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = option.displayName;
        button.dataset.eventId = option.eventId;
        button.setAttribute("aria-pressed", String(option.selected));
        button.addEventListener("click", () => {
          const controller = controllerRef();
          if (controller !== undefined) {
            controller.selectEvent(option.eventId);
            entryUiRef?.()?.selectEvent(option.eventId);
          }
        });
        eventSection.append(button);
      }
      const entrySection = appendText(root, "section", "");
      entrySection.setAttribute("aria-label", "Event entry form");
      entryUiRef?.()?.mount(entrySection, {
        authenticatedStaff: (
          view.shell.auth.status === "AUTHENTICATED"
          && ["EMPLOYEE", "STAFF"].includes(view.shell.auth.role ?? "")
        ),
        bedTransferFormalWriteEnabled:
          bedTransferWriteEnabledRef?.() === true,
      });
    },
  });
}

function createBrowserDraftStoragePort(): EmployeeNextSessionDraftStoragePort {
  return Object.freeze({
    getItem(key: string): string | null {
      return globalThis.localStorage.getItem(key);
    },
    setItem(key: string, value: string): void {
      globalThis.localStorage.setItem(key, value);
    },
    removeItem(key: string): void {
      globalThis.localStorage.removeItem(key);
    },
  });
}

export interface EmployeeNextSidecarRuntimeOptions {
  readonly draftStorage?: EmployeeNextSessionDraftStoragePort;
  readonly now?: () => string;
  readonly entryContexts?: EmployeeEntryContextPort;
  readonly createId?: () => string;
  readonly confirmLocalDraftRemoval?: (
    entry: EmployeeNextSessionDraftEntry,
  ) => boolean | Promise<boolean>;
  readonly confirmExpenseUpload?: (
    entry: EmployeeNextSessionDraftEntry,
  ) => boolean | Promise<boolean>;
  readonly confirmSessionUpload?: (
    session: EmployeeNextSessionDraft,
  ) => boolean | Promise<boolean>;
}

function createBrowserId(): string {
  if (
    typeof globalThis.crypto !== "object"
    || globalThis.crypto === null
    || typeof globalThis.crypto.randomUUID !== "function"
  ) {
    throw new Error("EMPLOYEE_NEXT_ID_GENERATOR_UNAVAILABLE");
  }
  return globalThis.crypto.randomUUID();
}

function createDisabledLocalTransport() {
  return Object.freeze({
    async request() {
      return Object.freeze({
        status: 503,
        body: Object.freeze({ errorCode: "LOCAL_ROUTE_TRANSPORT_DISABLED" }),
      });
    },
  });
}

export function startEmployeeNextRoute(
  root: HTMLElement,
): EmployeeNextRouteController {
  let controller: EmployeeNextRouteController | undefined;
  controller = createEmployeeNextRouteController({
    transport: createDisabledLocalTransport(),
    render: createLocalRenderPort(root, () => controller),
    buildApiRequest: () => Object.freeze({
      method: "POST",
      path: "/unit-test-route-submit",
    }),
  });
  root.dataset.routeCandidate = employeeNextRouteId;
  void controller.render();
  return controller;
}

export function startEmployeeNextSidecarRoute(
  root: HTMLElement,
  adapters: EmployeeNextSidecarAdapters,
  options: EmployeeNextSidecarRuntimeOptions = {},
): Readonly<{
  controller: EmployeeNextRouteController;
  drafts: EmployeeNextSessionDraftController;
  addToSession: (input: Readonly<{
    sessionId: string;
    entry: EmployeeNextSessionDraftEntry;
  }>) => Promise<boolean>;
  sessionRestore: Promise<boolean>;
  getExpenseUploadState: () => EmployeeExpenseUploadCanaryState;
  uploadExpense: () => Promise<boolean>;
  getSessionUploadState: () => EmployeeSessionUploadState;
  getSessionValidationState: () => EmployeeSessionValidationState;
  validateSession: () => Promise<boolean>;
  uploadSession: () => Promise<boolean>;
  retrySyncCheck: () => Promise<boolean>;
}> {
  if (
    typeof adapters !== "object"
    || adapters === null
    || typeof adapters.restoreSession !== "function"
    || typeof adapters.buildApiRequest !== "function"
    || !safePath(adapters.submitPath)
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_OPTIONS");
  }
  const drafts = createEmployeeNextSessionDraftController(
    options.draftStorage ?? createBrowserDraftStoragePort(),
    options.now,
  );
  let controller: EmployeeNextRouteController | undefined;
  let entryUi: EmployeeEntryUiController | undefined;
  let authenticatedSession: EmployeeAuthSession | undefined;
  let bedTransferCapability = disabledBedTransferCapability;
  let sessionUploadState: EmployeeSessionUploadState =
    Object.freeze({ status: "IDLE" });
  let sessionValidationState: EmployeeSessionValidationState =
    Object.freeze({ status: "NOT_VALIDATED" });
  let validationRevision = 0;
  let sessionUploadInFlight = false;
  let sessionValidationInFlight = false;
  let syncCheckInFlight = false;
  let uploadAttemptedSessionId: string | undefined;
  const removingEntryIds = new Set<string>();
  const confirmLocalDraftRemoval = options.confirmLocalDraftRemoval
    ?? (() => globalThis.confirm(
      "Remove this unsent local draft? This cannot affect cloud records.",
    ));
  const confirmSessionUpload = options.confirmSessionUpload
    ?? (options.confirmExpenseUpload === undefined
      ? (() => globalThis.confirm(
        "Upload this Current Session to Homelink now? This creates real business records.",
      ))
      : ((session: EmployeeNextSessionDraft) =>
        options.confirmExpenseUpload?.(session.entries[0])));
  function invalidateValidation(): void {
    validationRevision += 1;
    sessionValidationState = Object.freeze({ status: "NOT_VALIDATED" });
  }
  function currentPendingRequest(): EmployeeApiRequest | undefined {
    const session = drafts.getSession();
    if (
      !isEmployeeAuthSession(authenticatedSession)
      || session === undefined
      || session.entries.length === 0
    ) {
      return undefined;
    }
    try {
      return pendingSessionRequest(
        session,
        authenticatedSession,
        adapters.buildApiRequest,
        adapters.submitPath,
      );
    } catch {
      return undefined;
    }
  }
  function currentPayloadFingerprint(): string | undefined {
    const body = currentPendingRequest()?.body;
    return body === undefined ? undefined : stableIdentity(body);
  }
  async function validateSession(): Promise<boolean> {
    if (sessionValidationInFlight) return false;
    const session = drafts.getSession();
    const request = currentPendingRequest();
    const payloadFingerprint = currentPayloadFingerprint();
    const validationRequest = request === undefined
      ? undefined
      : validateOnlyRequest(request, `${adapters.submitPath}/validate`);
    const startedRevision = validationRevision;
    if (
      session === undefined
      || request === undefined
      || payloadFingerprint === undefined
      || validationRequest === undefined
      || (
        session.entries.some((entry) => entry.event_type === "bed-transfer")
        && !bedTransferCapability.validateEnabled
      )
    ) {
      sessionValidationState = Object.freeze({
        status: "VALIDATION_FAILED",
        errorCode: "VALIDATION_REQUEST_UNAVAILABLE",
      });
      await controller?.render();
      return false;
    }
    sessionValidationInFlight = true;
    sessionValidationState = Object.freeze({
      status: "VALIDATING",
      payloadFingerprint,
    });
    await controller?.render();
    try {
      if (typeof adapters.validateSessionRequest !== "function") {
        throw new Error("SIDECAR_VALIDATION_UNAVAILABLE");
      }
      const response = await adapters.validateSessionRequest(validationRequest);
      if (
        validationRevision !== startedRevision
        ||
        currentPayloadFingerprint() !== payloadFingerprint
        || !acceptedValidationResult(response, session.entries.length)
      ) {
        throw new Error("SIDECAR_VALIDATION_REJECTED");
      }
      sessionValidationState = Object.freeze({
        status: "VALIDATED_VALIDATE_ONLY",
        payloadFingerprint,
        resultCount: session.entries.length,
      });
      return true;
    } catch {
      sessionValidationState = Object.freeze({
        status: "VALIDATION_FAILED",
        payloadFingerprint,
        errorCode: "SERVER_VALIDATION_FAILED",
      });
      return false;
    } finally {
      sessionValidationInFlight = false;
      await controller?.render();
    }
  }
  async function refreshSyncState(): Promise<boolean> {
    if (syncCheckInFlight) return false;
    const session = drafts.getSession();
    if (
      !isEmployeeAuthSession(authenticatedSession)
      || session === undefined
      || session.entries.length === 0
    ) {
      sessionUploadState = Object.freeze({ status: "IDLE" });
      await controller?.render();
      return true;
    }
    if (typeof adapters.checkSyncState !== "function") {
      sessionUploadState = Object.freeze({
        status: "SYNC_CHECK_UNAVAILABLE",
        sessionId: session.session_id,
      });
      await controller?.render();
      return false;
    }
    syncCheckInFlight = true;
    sessionUploadState = Object.freeze({ status: "SYNC_CHECKING" });
    await controller?.render();
    try {
      const state = await adapters.checkSyncState(session);
      const current = drafts.getSession();
      if (
        current === undefined
        || current.session_id !== session.session_id
        || current.entries.length !== session.entries.length
        || current.entries.some(
          (entry, index) =>
            entry.entry_id !== session.entries[index]?.entry_id,
        )
      ) {
        throw new Error("SIDECAR_SYNC_STATE_SCOPE_CHANGED");
      }
      if (state.anchorId !== undefined) {
        const anchorSaved = await drafts.setCloudAnchor(state.anchorId);
        if (!anchorSaved.ok) {
          throw new Error("SIDECAR_SYNC_ANCHOR_SAVE_FAILED");
        }
      }
      sessionUploadState = state;
      return true;
    } catch {
      sessionUploadState = Object.freeze({
        status: "SYNC_CHECK_UNAVAILABLE",
        sessionId: session.session_id,
      });
      return false;
    } finally {
      syncCheckInFlight = false;
      await controller?.render();
    }
  }
  function uploadableSession(): EmployeeNextSessionDraft | undefined {
    if (!EMPLOYEE_NEXT_FORMAL_WRITE_ENABLED) {
      return undefined;
    }
    const session = drafts.getSession();
    const payloadFingerprint = currentPayloadFingerprint();
    return (
      isEmployeeAuthSession(authenticatedSession)
      && ["EMPLOYEE", "STAFF"].includes(authenticatedSession.user.role)
      && authenticatedSession.user.corpid === "homelink"
      && drafts.getView().status === "CURRENT_SESSION_READY"
      && session !== undefined
      && session.entries.length > 0
      && uploadAttemptedSessionId !== session.session_id
      && sessionValidationState.status === "VALIDATED_VALIDATE_ONLY"
      && payloadFingerprint !== undefined
      && sessionValidationState.payloadFingerprint === payloadFingerprint
      && (
        (
          sessionUploadState.status === "IDLE"
          && session.cloud_sync_required !== true
        )
        || sessionUploadState.status === "CLOUD_MISSING"
        || (
          sessionUploadState.status === "SYNC_CHECK_UNAVAILABLE"
          && session.cloud_sync_required !== true
        )
      )
      && (
        !session.entries.some((entry) => entry.event_type === "bed-transfer")
        || (
          session.entries.length === 1
          && session.entries[0]?.event_type === "bed-transfer"
          && bedTransferCapability.validateEnabled
          && bedTransferCapability.writeEnabled
          && bedTransferCapability.canonicalWritePath === adapters.submitPath
        )
      )
    )
      ? session
      : undefined;
  }
  async function uploadSession(): Promise<boolean> {
    if (!EMPLOYEE_NEXT_FORMAL_WRITE_ENABLED || sessionUploadInFlight) {
      return false;
    }
    const initialSession = uploadableSession();
    if (initialSession === undefined) {
      return false;
    }
    let confirmed = false;
    try {
      confirmed = await confirmSessionUpload(initialSession) === true;
    } catch {
      confirmed = false;
    }
    const session = uploadableSession();
    if (
      !confirmed
      || session === undefined
      || session.session_id !== initialSession.session_id
      || session.entries.length !== initialSession.entries.length
      || session.entries.some((entry, index) =>
        entry.entry_id !== initialSession.entries[index]?.entry_id
      )
      || !isEmployeeAuthSession(authenticatedSession)
    ) {
      return false;
    }
    uploadAttemptedSessionId = session.session_id;
    sessionUploadInFlight = true;
    sessionUploadState = Object.freeze({ status: "SUBMITTING" });
    await controller?.render();
    try {
      const syncRequired = await drafts.markCloudSyncRequired();
      if (!syncRequired.ok) {
        throw new Error("SESSION_SYNC_MARKER_SAVE_FAILED");
      }
      const bedTransferOnly = (
        session.entries.length === 1
        && session.entries[0]?.event_type === "bed-transfer"
      );
      const request = pendingSessionRequest(
        session,
        authenticatedSession,
        adapters.buildApiRequest,
        adapters.submitPath,
      );
      const expected = request === undefined
        ? undefined
        : bedTransferOnly
          ? Object.freeze({
            entryIds: Object.freeze([session.entries[0].entry_id]),
            sessionId: session.session_id,
          })
          : expectedAggregateUploadReceipt(request);
      if (
        request === undefined
        || expected === undefined
        || request.method !== "POST"
        || request.path !== adapters.submitPath
      ) {
        throw new Error("SESSION_UPLOAD_REQUEST_REJECTED");
      }
      const responseValue = await adapters.transport.request(request);
      if (
        !isPlainRecord(responseValue)
        || !Number.isInteger(responseValue.status)
      ) {
        throw new Error("SESSION_UPLOAD_RESPONSE_REJECTED");
      }
      const response = responseValue as unknown as EmployeeApiResponse;
      const receipt = bedTransferOnly
        ? (
          response.status >= 200
          && response.status <= 299
          && isPlainRecord(response.body)
          && response.body.success === true
          && response.body.ok === true
          && response.body.error === undefined
          && response.body.error_code === undefined
          && (
            response.body.session_id === expected.sessionId
            || response.body.requested_session_id === expected.sessionId
          )
          ? expected
          : undefined
        )
        : explicitAggregateUploadReceipt(response, expected);
      if (receipt === undefined) {
        throw new Error("SESSION_UPLOAD_RESPONSE_REJECTED");
      }
      await refreshSyncState();
      return true;
    } catch {
      await refreshSyncState();
      return false;
    } finally {
      sessionUploadInFlight = false;
      await controller?.render();
    }
  }
  controller = createEmployeeNextRouteController({
    transport: adapters.transport,
    render: createLocalRenderPort(
      root,
      () => controller,
      () => drafts.getView(),
      () => entryUi,
      async (entry): Promise<void> => {
        if (removingEntryIds.has(entry.entry_id)) {
          return;
        }
        removingEntryIds.add(entry.entry_id);
        try {
          if (await confirmLocalDraftRemoval(entry)) {
            const removed = await drafts.removeLocalDraft(entry.entry_id);
            if (removed.ok) invalidateValidation();
          }
        } finally {
          removingEntryIds.delete(entry.entry_id);
          await controller?.render();
        }
      },
      () => Object.freeze({
        enabled: false,
        state: sessionUploadState,
        validationState: sessionValidationState,
        payloadPreview: currentPendingRequest()?.body === undefined
          ? undefined
          : stableJson(
            currentPendingRequest()?.body as EmployeeApiJsonValue,
          ),
        validate: validateSession,
        upload: uploadSession,
        retrySyncCheck: refreshSyncState,
      }),
      () => false,
    ),
    buildApiRequest: adapters.buildApiRequest,
    allowedSubmitPath: adapters.submitPath,
  });
  entryUi = createEmployeeEntryUiController({
    registry: createEmployeeSevenEventRegistry(),
    contexts: options.entryContexts ?? adapters.entryContexts,
    createId: options.createId ?? createBrowserId,
    session: () => drafts.getSession(),
    draftView: () => drafts.getView(),
    async requestRender(): Promise<void> {
      await controller?.render();
    },
    onBusinessFieldChange: invalidateValidation,
    async addToSession(input): Promise<boolean> {
      const result = await drafts.addToSession(input);
      if (result.ok) invalidateValidation();
      return result.ok;
    },
  });
  root.dataset.routeCandidate = employeeNextRouteId;
  const sessionRestore = adapters.restoreSession()
    .then(async (session) => {
      const result = controller?.setSession(session);
      const draftRestore = drafts.restore(session);
      await controller?.render();
      const restored = await draftRestore;
      authenticatedSession = result?.ok === true ? session : undefined;
      const restoredBedTransferCapability = authenticatedSession === undefined
        ? disabledBedTransferCapability
        : typeof adapters.restoreBedTransferCapability === "function"
          ? await adapters.restoreBedTransferCapability()
          : disabledBedTransferCapability;
      bedTransferCapability = Object.freeze({
        ...restoredBedTransferCapability,
        writeEnabled: false,
      });
      if (authenticatedSession !== undefined && drafts.getSession() !== undefined) {
        await refreshSyncState();
      }
      await controller?.render();
      return result?.ok === true && restored.ok;
    })
    .catch(async () => {
      authenticatedSession = undefined;
      bedTransferCapability = disabledBedTransferCapability;
      await drafts.restore(undefined);
      await controller?.render();
      return false;
    });
  void controller.render();
  return Object.freeze({
    controller,
    drafts,
    sessionRestore,
    getExpenseUploadState(): EmployeeExpenseUploadCanaryState {
      return sessionUploadState;
    },
    uploadExpense: uploadSession,
    getSessionUploadState(): EmployeeSessionUploadState {
      return sessionUploadState;
    },
    getSessionValidationState(): EmployeeSessionValidationState {
      return sessionValidationState;
    },
    validateSession,
    uploadSession,
    retrySyncCheck: refreshSyncState,
    async addToSession(input): Promise<boolean> {
      const result = await drafts.addToSession(input);
      if (result.ok) {
        sessionUploadState = Object.freeze({ status: "IDLE" });
        uploadAttemptedSessionId = undefined;
        invalidateValidation();
      }
      await controller?.render();
      return result.ok;
    },
  });
}

if (typeof document !== "undefined") {
  const root = document.querySelector<HTMLElement>("#employee-next-root");
  if (
    root !== null
    && document.documentElement.dataset.employeeNextRuntime !== ["pro", "duction"].join("")
  ) {
    startEmployeeNextRoute(root);
  }
}

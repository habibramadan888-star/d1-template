import type {
  EmployeeDraftPayload,
} from "../core/draft-store";
import {
  hasBlockingValidationIssue,
  isEmployeeEventId,
  type EmployeeEventId,
  type EventValidationIssue,
} from "../core/event-contract";
import type {
  EmployeeEventRegistry,
  EmployeeEventRegistryContract,
} from "../core/event-registry";
import {
  EMPLOYEE_ARREARS_PAYMENT_METHODS,
} from "../events/arrears-payment";
import {
  EMPLOYEE_BED_TRANSFER_FEE_MODES,
  EMPLOYEE_BED_TRANSFER_PAYMENT_METHODS,
  EMPLOYEE_BED_TRANSFER_PRICE_DIFFERENCE_MODES,
} from "../events/bed-transfer";
import {
  EMPLOYEE_CHECKOUT_MODES,
} from "../events/checkout";
import {
  EMPLOYEE_DEPOSIT_IN_PAYMENT_METHODS,
} from "../events/deposit-in";
import {
  EMPLOYEE_DEPOSIT_OUT_REFUND_METHODS,
} from "../events/deposit-out";
import {
  EMPLOYEE_EXPENSE_CATEGORIES,
  EMPLOYEE_EXPENSE_PAYMENT_METHODS,
  EMPLOYEE_EXPENSE_SCOPES,
  employeeExpenseAedToFils,
} from "../events/expense";
import {
  EMPLOYEE_RENT_PAYMENT_METHODS,
  EMPLOYEE_RENT_SHORT_PAYMENT_MODES,
} from "../events/rent";
import type {
  EmployeeNextSessionDraft,
  EmployeeNextSessionDraftEntry,
  EmployeeNextSessionDraftView,
} from "../session-draft";

type DraftRecord = Record<string, unknown>;

export interface EmployeeEntryContextSnapshot {
  readonly ready: boolean;
  readonly values: Readonly<Record<string, unknown>>;
  readonly summary: string;
}

export interface EmployeeEntryContextPort {
  read(
    eventId: EmployeeEventId,
    draft: Readonly<Record<string, unknown>>,
  ): EmployeeEntryContextSnapshot | undefined;
  refresh?(
    eventId: EmployeeEventId,
    draft: Readonly<Record<string, unknown>>,
    force?: boolean,
  ): Promise<void>;
}

type FieldKind = "text" | "date" | "number" | "select" | "checkbox" | "textarea";

interface FieldDefinition {
  readonly name: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly options?: readonly string[];
  readonly systemRead?: boolean;
  readonly preserveDecimalText?: boolean;
}

export interface EmployeeEntryTemplate {
  readonly eventType: EmployeeEventId;
  readonly displayName: string;
  readonly employeeEditableFields: readonly string[];
  readonly systemReadFields: readonly string[];
  readonly requiredFields: readonly string[];
  readonly forbiddenFields: readonly string[];
  createInitialFormState(context?: EmployeeEntryContextSnapshot): DraftRecord;
  updateFormState(
    draft: Readonly<DraftRecord>,
    field: string,
    value: unknown,
    context?: EmployeeEntryContextSnapshot,
  ): DraftRecord;
  validate(
    draft: Readonly<DraftRecord>,
    context?: EmployeeEntryContextSnapshot,
  ): readonly EventValidationIssue[];
  buildDraftEntry(
    draft: Readonly<DraftRecord>,
    entryId: string,
    context?: EmployeeEntryContextSnapshot,
  ): EmployeeNextSessionDraftEntry;
  mount(
    parent: HTMLElement,
    options: EmployeeEntryTemplateMountOptions,
  ): void;
}

export interface EmployeeEntryTemplateMountOptions {
  readonly draft: Readonly<DraftRecord>;
  readonly context?: EmployeeEntryContextSnapshot;
  readonly issues: readonly EventValidationIssue[];
  readonly canAdd: boolean;
  readonly busy: boolean;
  readonly errorCode?: string;
  readonly bedTransferFormalWriteEnabled?: boolean;
  readonly onChange: (field: string, value: unknown) => void;
  readonly onAdd: () => void;
  readonly onRetryContext: () => void;
}

export interface EmployeeEntryTemplateRegistry {
  readonly eventTypes: readonly EmployeeEventId[];
  readonly templates: readonly EmployeeEntryTemplate[];
  get(value: unknown): EmployeeEntryTemplate | undefined;
}

export interface EmployeeEntryUiControllerOptions {
  readonly registry: EmployeeEventRegistry;
  readonly contexts?: EmployeeEntryContextPort;
  readonly createId: () => string;
  readonly addToSession: (input: Readonly<{
    sessionId: string;
    entry: EmployeeNextSessionDraftEntry;
  }>) => Promise<boolean>;
  readonly session: () => EmployeeNextSessionDraft | undefined;
  readonly draftView: () => EmployeeNextSessionDraftView;
  readonly requestRender: () => void | Promise<void>;
  readonly onBusinessFieldChange?: () => void;
}

export interface EmployeeEntryUiController {
  selectEvent(value: unknown): boolean;
  mount(
    parent: HTMLElement,
    gate: Readonly<{
      authenticatedStaff: boolean;
      bedTransferFormalWriteEnabled?: boolean;
    }>,
  ): void;
  getSelectedEvent(): EmployeeEventId | undefined;
  getDraft(): Readonly<DraftRecord> | undefined;
}

const emptyForbiddenFields = Object.freeze([
  "providerIdentity",
  "tenantCardId",
  "ttlockId",
  "canonicalAnchorId",
  "backendPayload",
]);

function issue(
  code: string,
  message: string,
  field?: string,
): EventValidationIssue {
  return Object.freeze({
    code,
    message,
    severity: "ERROR" as const,
    ...(field === undefined ? {} : { field }),
  });
}

function cloneDraft(value: object): DraftRecord {
  return { ...(value as Readonly<Record<string, unknown>>) };
}

function applyContext(
  draft: DraftRecord,
  context: EmployeeEntryContextSnapshot | undefined,
  fields: readonly string[],
): DraftRecord {
  if (context === undefined) {
    return draft;
  }
  const next = { ...draft };
  for (const field of fields) {
    if (Object.hasOwn(context.values, field)) {
      next[field] = context.values[field];
    }
  }
  return next;
}

function paymentLegs(
  submission: Readonly<Record<string, unknown>>,
  key: "payment" | "refund",
): Readonly<{ cash: number; bank: number }> {
  const value = submission[key];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return Object.freeze({ cash: 0, bank: 0 });
  }
  const legs = (value as Readonly<Record<string, unknown>>).legs;
  if (!Array.isArray(legs)) {
    return Object.freeze({ cash: 0, bank: 0 });
  }
  let cash = 0;
  let bank = 0;
  for (const leg of legs) {
    if (typeof leg !== "object" || leg === null || Array.isArray(leg)) {
      continue;
    }
    const record = leg as Readonly<Record<string, unknown>>;
    const amount = typeof record.amountAed === "number" ? record.amountAed : 0;
    if (record.method === "cash") cash += amount;
    if (record.method === "bank") bank += amount;
  }
  return Object.freeze({ cash, bank });
}

function receivedTotals(
  eventType: EmployeeEventId,
  submission: Readonly<Record<string, unknown>>,
): Readonly<{ cash: number; bank: number }> {
  if (["rent", "arrears-payment", "deposit-in"].includes(eventType)) {
    return paymentLegs(submission, "payment");
  }
  if (eventType === "bed-transfer") {
    const fee = submission.transferFeePreview;
    if (typeof fee !== "object" || fee === null || Array.isArray(fee)) {
      return Object.freeze({ cash: 0, bank: 0 });
    }
    const record = fee as Readonly<Record<string, unknown>>;
    const amount = record.mode === "paid" && typeof record.declaredAmountAed === "number"
      ? record.declaredAmountAed
      : 0;
    return Object.freeze({
      cash: record.paymentMethod === "cash" ? amount : 0,
      bank: record.paymentMethod === "bank" ? amount : 0,
    });
  }
  return Object.freeze({ cash: 0, bank: 0 });
}

function readInputValue(field: FieldDefinition, input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): unknown {
  if (field.kind === "checkbox") {
    return (input as HTMLInputElement).checked;
  }
  if (field.kind === "number") {
    return input.value.trim() === ""
      ? null
      : field.preserveDecimalText === true
        ? input.value
        : Number(input.value);
  }
  return input.value;
}

function writeInputValue(
  field: FieldDefinition,
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: unknown,
): void {
  if (field.kind === "checkbox") {
    (input as HTMLInputElement).checked = value === true;
  } else {
    input.value = value === null || value === undefined ? "" : String(value);
  }
}

function fieldElement(field: FieldDefinition): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  if (field.kind === "select") {
    const select = document.createElement("select");
    for (const optionValue of field.options ?? []) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue.replaceAll("_", " ");
      select.append(option);
    }
    return select;
  }
  if (field.kind === "textarea") {
    return document.createElement("textarea");
  }
  const input = document.createElement("input");
  input.type = field.kind === "checkbox" ? "checkbox" : field.kind;
  return input;
}

function mountFields(
  template: Readonly<{ displayName: string; fields: readonly FieldDefinition[] }>,
  parent: HTMLElement,
  options: EmployeeEntryTemplateMountOptions,
): void {
  parent.replaceChildren();
  parent.dataset.eventForm = template.displayName;
  parent.setAttribute("style", "max-width:100%;overflow-wrap:anywhere");
  const heading = document.createElement("h2");
  heading.textContent = template.displayName;
  parent.append(heading);

  if (options.context !== undefined) {
    const context = document.createElement("p");
    context.dataset.contextStatus = options.context.ready ? "ready" : "unavailable";
    context.textContent = options.context.summary;
    parent.append(context);
    if (!options.context.ready) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "Retry Context";
      retry.dataset.action = "retry-context";
      retry.addEventListener("click", options.onRetryContext);
      parent.append(retry);
    }
  }

  const issueByField = new Map<string, EventValidationIssue[]>();
  for (const validationIssue of options.issues) {
    const key = validationIssue.field ?? "_form";
    issueByField.set(key, [...(issueByField.get(key) ?? []), validationIssue]);
  }

  for (const field of template.fields) {
    const wrapper = document.createElement("label");
    wrapper.dataset.field = field.name;
    wrapper.setAttribute("style", "display:grid;gap:.25rem;max-width:100%;margin:.5rem 0");
    const label = document.createElement("span");
    label.textContent = field.label;
    wrapper.append(label);
    const input = fieldElement(field);
    input.dataset.fieldInput = field.name;
    input.setAttribute("style", "box-sizing:border-box;max-width:100%;width:100%");
    if (field.systemRead === true) {
      input.disabled = true;
      input.setAttribute("aria-readonly", "true");
    }
    writeInputValue(field, input, options.draft[field.name]);
    input.addEventListener("input", () => {
      options.onChange(field.name, readInputValue(field, input));
    });
    input.addEventListener("change", () => {
      options.onChange(field.name, readInputValue(field, input));
    });
    wrapper.append(input);
    for (const fieldIssue of issueByField.get(field.name) ?? []) {
      const error = document.createElement("small");
      error.dataset.validationCode = fieldIssue.code;
      error.textContent = fieldIssue.message;
      wrapper.append(error);
    }
    parent.append(wrapper);
  }

  for (const formIssue of issueByField.get("_form") ?? []) {
    const error = document.createElement("p");
    error.dataset.validationCode = formIssue.code;
    error.textContent = formIssue.message;
    parent.append(error);
  }
  if (options.errorCode !== undefined) {
    const error = document.createElement("p");
    error.dataset.addError = options.errorCode;
    error.textContent = options.errorCode;
    parent.append(error);
  }
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = options.busy ? "Adding…" : "Add to Session";
  add.dataset.action = "add-to-session";
  add.disabled = !options.canAdd || options.busy;
  add.addEventListener("click", options.onAdd);
  parent.append(add);
}

function syncPayment(
  draft: DraftRecord,
  amountField: string,
  methodField: string,
  cashField: string,
  bankField: string,
): DraftRecord {
  const next = { ...draft };
  const amount = (
    typeof next[amountField] === "number"
    || typeof next[amountField] === "string"
  )
    ? next[amountField]
    : null;
  if (next[methodField] === "cash") {
    next[cashField] = amount;
    next[bankField] = 0;
  } else if (next[methodField] === "bank") {
    next[cashField] = 0;
    next[bankField] = amount;
  }
  return next;
}

interface TemplateDefinition {
  readonly eventType: EmployeeEventId;
  readonly fields: readonly FieldDefinition[];
  readonly systemReadFields: readonly string[];
  readonly requiredFields: readonly string[];
  readonly notice?: string;
  readonly update?: (draft: DraftRecord) => DraftRecord;
  readonly extraValidate?: (
    draft: Readonly<DraftRecord>,
    context?: EmployeeEntryContextSnapshot,
  ) => readonly EventValidationIssue[];
}

function createTemplate(
  contract: EmployeeEventRegistryContract,
  definition: TemplateDefinition,
): EmployeeEntryTemplate {
  if (contract.eventId !== definition.eventType) {
    throw new Error("EMPLOYEE_ENTRY_TEMPLATE_CONTRACT_MISMATCH");
  }
  const editableFields = Object.freeze(
    definition.fields.filter((field) => field.systemRead !== true).map((field) => field.name),
  );
  const fields = Object.freeze([...definition.fields]);
  const systemReadFields = Object.freeze([...definition.systemReadFields]);
  const requiredFields = Object.freeze([...definition.requiredFields]);

  function contextualDraft(
    source: Readonly<DraftRecord>,
    context?: EmployeeEntryContextSnapshot,
  ): DraftRecord {
    return definition.update?.(
      applyContext({ ...source }, context, systemReadFields),
    ) ?? applyContext({ ...source }, context, systemReadFields);
  }

  const template: EmployeeEntryTemplate = {
    eventType: definition.eventType,
    displayName: contract.displayName,
    employeeEditableFields: editableFields,
    systemReadFields,
    requiredFields,
    forbiddenFields: emptyForbiddenFields,
    createInitialFormState(context): DraftRecord {
      return contextualDraft(cloneDraft(contract.createInitialDraft()), context);
    },
    updateFormState(draft, field, value, context): DraftRecord {
      if (!editableFields.includes(field)) {
        return contextualDraft(draft, context);
      }
      return contextualDraft({ ...draft, [field]: value }, context);
    },
    validate(draft, context): readonly EventValidationIssue[] {
      const exactDraft = contextualDraft(draft, context);
      const contextIssues = systemReadFields.length > 0 && context?.ready !== true
        ? [issue(
          `${definition.eventType.toUpperCase().replaceAll("-", "_")}_CONTEXT_UNAVAILABLE`,
          "Required read-only context is unavailable.",
        )]
        : [];
      return Object.freeze([
        ...contextIssues,
        ...contract.validateDraft(exactDraft),
        ...(definition.extraValidate?.(exactDraft, context) ?? []),
      ]);
    },
    buildDraftEntry(draft, entryId, context): EmployeeNextSessionDraftEntry {
      const exactDraft = contextualDraft(draft, context);
      const issues = template.validate(exactDraft, context);
      if (
        hasBlockingValidationIssue(issues)
        || typeof entryId !== "string"
        || entryId.trim().length === 0
      ) {
        throw new Error("EMPLOYEE_ENTRY_TEMPLATE_INVALID_DRAFT");
      }
      const submission = contract.buildSubmission(exactDraft) as
        Readonly<Record<string, unknown>>;
      const totals = receivedTotals(definition.eventType, submission);
      return Object.freeze({
        entry_id: entryId.trim(),
        event_type: definition.eventType,
        payload: submission as EmployeeDraftPayload,
        cash_amount_aed: totals.cash,
        bank_amount_aed: totals.bank,
      });
    },
    mount(parent, options): void {
      mountFields({ displayName: contract.displayName, fields }, parent, options);
      if (definition.notice !== undefined) {
        const notice = document.createElement("p");
        notice.dataset.templateNotice = definition.eventType;
        notice.textContent = definition.eventType === "bed-transfer"
          && options.bedTransferFormalWriteEnabled === true
          ? "Formal Bed Transfer write: enabled through the canonical employee entry."
          : definition.notice;
        parent.append(notice);
      }
    },
  };
  return Object.freeze(template);
}

const text = (name: string, label: string, systemRead = false): FieldDefinition =>
  Object.freeze({ name, label, kind: "text" as const, systemRead });
const date = (name: string, label: string): FieldDefinition =>
  Object.freeze({ name, label, kind: "date" as const });
const number = (name: string, label: string, systemRead = false): FieldDefinition =>
  Object.freeze({ name, label, kind: "number" as const, systemRead });
const decimalMoney = (name: string, label: string): FieldDefinition =>
  Object.freeze({
    name,
    label,
    kind: "number" as const,
    preserveDecimalText: true,
  });
const textarea = (name: string, label: string): FieldDefinition =>
  Object.freeze({ name, label, kind: "textarea" as const });
const checkbox = (name: string, label: string): FieldDefinition =>
  Object.freeze({ name, label, kind: "checkbox" as const });
const select = (
  name: string,
  label: string,
  options: readonly string[],
): FieldDefinition => Object.freeze({
  name,
  label,
  kind: "select" as const,
  options,
});

function rentDefinition(): TemplateDefinition {
  return Object.freeze({
    eventType: "rent",
    fields: Object.freeze([
      text("bedLabel", "Bed"),
      date("rentPeriodStart", "Rent period start"),
      date("rentPeriodEnd", "Rent period end"),
      number("amountDueAed", "Expected rent (AED)", true),
      number("amountReceivedAed", "Paid amount (AED)"),
      select("paymentMethod", "Payment", EMPLOYEE_RENT_PAYMENT_METHODS),
      number("cashReceivedAed", "Cash (AED)"),
      number("bankReceivedAed", "Bank (AED)"),
      select("shortPaymentMode", "Short payment handling", EMPLOYEE_RENT_SHORT_PAYMENT_MODES),
      date("promiseDate", "Promise date"),
      textarea("note", "Reason / note"),
    ]),
    systemReadFields: Object.freeze(["amountDueAed"]),
    requiredFields: Object.freeze([
      "bedLabel", "rentPeriodStart", "rentPeriodEnd", "amountDueAed",
      "amountReceivedAed", "paymentMethod",
    ]),
    update: (draft: DraftRecord) => syncPayment(
      draft,
      "amountReceivedAed",
      "paymentMethod",
      "cashReceivedAed",
      "bankReceivedAed",
    ),
  });
}

function arrearsDefinition(): TemplateDefinition {
  return Object.freeze({
    eventType: "arrears-payment",
    fields: Object.freeze([
      text("bedLabel", "Bed"),
      text("cloudArrearsRef", "Cloud arrears reference", true),
      number("remainingArrearsAed", "Remaining before payment (AED)", true),
      number("amountReceivedAed", "Payment amount (AED)"),
      select("paymentMethod", "Payment", EMPLOYEE_ARREARS_PAYMENT_METHODS),
      number("cashReceivedAed", "Cash (AED)"),
      number("bankReceivedAed", "Bank (AED)"),
      date("repaymentDate", "Repayment date"),
      textarea("note", "Note"),
    ]),
    systemReadFields: Object.freeze(["cloudArrearsRef", "remainingArrearsAed"]),
    requiredFields: Object.freeze([
      "bedLabel", "cloudArrearsRef", "remainingArrearsAed",
      "amountReceivedAed", "paymentMethod", "repaymentDate",
    ]),
    update: (draft: DraftRecord) => syncPayment(
      draft,
      "amountReceivedAed",
      "paymentMethod",
      "cashReceivedAed",
      "bankReceivedAed",
    ),
  });
}

function depositInDefinition(): TemplateDefinition {
  return Object.freeze({
    eventType: "deposit-in",
    fields: Object.freeze([
      text("bedLabel", "Bed"),
      number("depositAmountAed", "Deposit amount (AED)"),
      select("paymentMethod", "Payment", EMPLOYEE_DEPOSIT_IN_PAYMENT_METHODS),
      number("cashReceivedAed", "Cash (AED)"),
      number("bankReceivedAed", "Bank (AED)"),
      date("depositReceivedDate", "Deposit received date"),
      number("depositRequiredTotalAed", "Required deposit total (AED)", true),
      number("currentDepositSnapshotAed", "Current deposit snapshot (AED)", true),
      textarea("note", "Note"),
    ]),
    systemReadFields: Object.freeze([
      "depositRequiredTotalAed",
      "currentDepositSnapshotAed",
    ]),
    requiredFields: Object.freeze([
      "bedLabel", "depositAmountAed", "paymentMethod", "depositReceivedDate",
      "depositRequiredTotalAed", "currentDepositSnapshotAed",
    ]),
    update: (draft: DraftRecord) => syncPayment(
      draft,
      "depositAmountAed",
      "paymentMethod",
      "cashReceivedAed",
      "bankReceivedAed",
    ),
  });
}

function depositOutDefinition(): TemplateDefinition {
  return Object.freeze({
    eventType: "deposit-out",
    fields: Object.freeze([
      text("bedLabel", "Bed"),
      number("currentDepositSnapshotAed", "TTLock D snapshot (AED)", true),
      number("refundAmountAed", "Actual refund amount (AED)"),
      select("refundMethod", "Refund method", EMPLOYEE_DEPOSIT_OUT_REFUND_METHODS),
      number("cashRefundedAed", "Cash refund (AED)"),
      number("bankRefundedAed", "Bank refund (AED)"),
      date("refundDate", "Refund date"),
      textarea("differenceReason", "Difference reason"),
      textarea("note", "Note"),
    ]),
    systemReadFields: Object.freeze(["currentDepositSnapshotAed"]),
    requiredFields: Object.freeze([
      "bedLabel", "currentDepositSnapshotAed", "refundAmountAed",
      "refundMethod", "refundDate",
    ]),
    update: (draft: DraftRecord) => syncPayment(
      draft,
      "refundAmountAed",
      "refundMethod",
      "cashRefundedAed",
      "bankRefundedAed",
    ),
  });
}

function checkoutDefinition(): TemplateDefinition {
  return Object.freeze({
    eventType: "checkout",
    fields: Object.freeze([
      text("bedLabel", "Bed"),
      date("checkoutDate", "Checkout date"),
      select("checkoutMode", "Checkout mode", EMPLOYEE_CHECKOUT_MODES),
      number("currentDepositSnapshotAed", "Current deposit snapshot (AED)", true),
      number("depositRefundAed", "Deposit refund declaration (AED)"),
      textarea("depositDifferenceReason", "Deposit difference reason"),
      number("outstandingArrearsSnapshotAed", "Outstanding arrears (AED)", true),
      text("cloudArrearsRef", "Cloud arrears reference", true),
      text("formerCustomerName", "Former customer name"),
      text("formerCustomerPhone", "Former customer phone"),
      text("contactMethod", "Contact method"),
      textarea("contactNote", "Contact note"),
      checkbox("belongingsHeld", "Belongings held"),
      textarea("belongingsNote", "Belongings note"),
      date("promisedPaymentDate", "Promised payment date"),
      date("promisedReturnDate", "Promised return date"),
      textarea("finalNote", "Final note"),
    ]),
    systemReadFields: Object.freeze([
      "currentDepositSnapshotAed",
      "outstandingArrearsSnapshotAed",
      "cloudArrearsRef",
    ]),
    requiredFields: Object.freeze([
      "bedLabel", "checkoutDate", "checkoutMode",
      "currentDepositSnapshotAed", "depositRefundAed",
      "outstandingArrearsSnapshotAed",
    ]),
  });
}

function expenseDefinition(): TemplateDefinition {
  return Object.freeze({
    eventType: "expense",
    fields: Object.freeze([
      date("expenseDate", "Expense date"),
      select("expenseCategory", "Category", EMPLOYEE_EXPENSE_CATEGORIES),
      decimalMoney("expenseAmountAed", "Amount (AED)"),
      select("paymentMethod", "Payment", EMPLOYEE_EXPENSE_PAYMENT_METHODS),
      decimalMoney("cashPaidAed", "Cash (AED)"),
      decimalMoney("bankPaidAed", "Bank (AED)"),
      select("expenseScope", "Expense target", EMPLOYEE_EXPENSE_SCOPES),
      text("apartmentLabel", "Apartment"),
      text("bedLabel", "Bed"),
      text("vendorName", "Vendor"),
      text("paidBy", "Paid by"),
      textarea("expenseDescription", "Reason / description"),
      checkbox("receiptAvailable", "Evidence available"),
      textarea("receiptNote", "Evidence note"),
      textarea("finalNote", "Final note"),
    ]),
    systemReadFields: Object.freeze([]),
    requiredFields: Object.freeze([
      "expenseDate", "expenseCategory", "expenseAmountAed", "paymentMethod",
      "expenseScope", "vendorName", "expenseDescription",
    ]),
    update: (draft: DraftRecord) => syncPayment(
      draft,
      "expenseAmountAed",
      "paymentMethod",
      "cashPaidAed",
      "bankPaidAed",
    ),
    extraValidate(draft: Readonly<DraftRecord>): readonly EventValidationIssue[] {
      return (
        (employeeExpenseAedToFils(draft.expenseAmountAed) ?? 0n) >= 10_000n
        && (
          draft.receiptAvailable !== true
          || typeof draft.receiptNote !== "string"
          || draft.receiptNote.trim().length === 0
        )
      )
        ? Object.freeze([issue(
          "EXPENSE_EVIDENCE_REQUIRED",
          "Evidence and an evidence note are required for expenses of AED 100 or more.",
          "receiptAvailable",
        )])
        : Object.freeze([]);
    },
  });
}

function bedTransferDefinition(): TemplateDefinition {
  return Object.freeze({
    eventType: "bed-transfer",
    fields: Object.freeze([
      text("fromBed", "Source bed"),
      text("toBed", "Target bed"),
      date("transferDate", "Transfer date"),
      textarea("transferReason", "Transfer reason"),
      text("companyScope", "Company scope", true),
      select("transferFeeMode", "Transfer fee mode", EMPLOYEE_BED_TRANSFER_FEE_MODES),
      number("transferFeeAmountAed", "Transfer fee (AED)"),
      select(
        "transferFeePaymentMethod",
        "Transfer fee payment",
        EMPLOYEE_BED_TRANSFER_PAYMENT_METHODS,
      ),
      date("transferFeeDueDate", "Transfer fee due date"),
      textarea("transferFeeWaiverReason", "Transfer fee waiver reason"),
      select(
        "bedPriceDifferenceMode",
        "Bed price difference mode",
        EMPLOYEE_BED_TRANSFER_PRICE_DIFFERENCE_MODES,
      ),
      number("bedPriceDifferenceAmountAed", "Bed price difference (AED)"),
      select(
        "bedPriceDifferencePaymentMethod",
        "Bed price difference payment",
        EMPLOYEE_BED_TRANSFER_PAYMENT_METHODS,
      ),
      date("bedPriceDifferenceDueDate", "Bed price difference due date"),
      textarea("bedPriceDifferenceReason", "Bed price difference reason"),
      checkbox("arrearsCarryoverAccepted", "Arrears carryover accepted"),
      text("cloudArrearsRef", "Cloud arrears reference", true),
      number("carriedArrearsAmountAed", "Carried arrears amount (AED)", true),
      textarea("finalNote", "Note"),
    ]),
    systemReadFields: Object.freeze([
      "companyScope",
      "sourceAccessSnapshot",
      "targetAccessSnapshot",
      "cloudArrearsRef",
      "carriedArrearsAmountAed",
    ]),
    requiredFields: Object.freeze([
      "fromBed", "toBed", "transferDate", "transferReason", "companyScope",
      "sourceAccessSnapshot", "targetAccessSnapshot", "transferFeeMode",
    ]),
    notice: "Formal Bed Transfer write: disabled. Local draft only.",
  });
}

export function createEmployeeEntryTemplateRegistry(
  registry: EmployeeEventRegistry,
): EmployeeEntryTemplateRegistry {
  const definitions = [
    rentDefinition(),
    arrearsDefinition(),
    depositInDefinition(),
    depositOutDefinition(),
    checkoutDefinition(),
    expenseDefinition(),
    bedTransferDefinition(),
  ];
  const templates = Object.freeze(definitions.map((definition) => {
    const contract = registry.get(definition.eventType);
    if (contract === undefined) {
      throw new Error("EMPLOYEE_ENTRY_TEMPLATE_CONTRACT_MISSING");
    }
    return createTemplate(contract, definition);
  }));
  const byEvent = new Map(templates.map((template) => [
    template.eventType,
    template,
  ]));
  return Object.freeze({
    eventTypes: Object.freeze(templates.map((template) => template.eventType)),
    templates,
    get(value: unknown): EmployeeEntryTemplate | undefined {
      return isEmployeeEventId(value) ? byEvent.get(value) : undefined;
    },
  });
}

function defaultContext(eventId: EmployeeEventId): EmployeeEntryContextSnapshot | undefined {
  return eventId === "expense"
    ? Object.freeze({
      ready: true,
      values: Object.freeze({}),
      summary: "No business identity is required for this local expense draft.",
    })
    : Object.freeze({
      ready: false,
      values: Object.freeze({}),
      summary: "Required read-only business context is not available.",
    });
}

export function createEmployeeEntryUiController(
  options: EmployeeEntryUiControllerOptions,
): EmployeeEntryUiController {
  if (
    typeof options !== "object"
    || options === null
    || typeof options.createId !== "function"
    || typeof options.addToSession !== "function"
    || typeof options.session !== "function"
    || typeof options.draftView !== "function"
    || typeof options.requestRender !== "function"
  ) {
    throw new Error("EMPLOYEE_ENTRY_UI_INVALID_OPTIONS");
  }
  const templates = createEmployeeEntryTemplateRegistry(options.registry);
  let selected: EmployeeEntryTemplate | undefined;
  let draft: DraftRecord | undefined;
  let context: EmployeeEntryContextSnapshot | undefined;
  let busy = false;
  let errorCode: string | undefined;
  let newSessionId: string | undefined;

  function readContext(
    template: EmployeeEntryTemplate,
    currentDraft: Readonly<DraftRecord>,
  ): EmployeeEntryContextSnapshot | undefined {
    return options.contexts?.read(template.eventType, currentDraft)
      ?? defaultContext(template.eventType);
  }

  function reset(template: EmployeeEntryTemplate): void {
    const initial = template.createInitialFormState();
    context = readContext(template, initial);
    draft = template.createInitialFormState(context);
    errorCode = undefined;
  }

  function rerender(): void {
    void options.requestRender();
  }

  function refreshContext(
    template: EmployeeEntryTemplate,
    currentDraft: Readonly<DraftRecord>,
    force = false,
  ): void {
    if (
      options.contexts === undefined
      || typeof options.contexts.refresh !== "function"
      || template.eventType === "expense"
    ) {
      return;
    }
    void options.contexts.refresh(template.eventType, currentDraft, force)
      .finally(() => {
        if (selected === template && draft !== undefined) {
          context = readContext(template, draft);
          rerender();
        }
      });
  }

  const controller: EmployeeEntryUiController = {
    selectEvent(value): boolean {
      const template = templates.get(value);
      if (template === undefined) {
        selected = undefined;
        draft = undefined;
        context = undefined;
        errorCode = "UNKNOWN_EVENT_TYPE";
        rerender();
        return false;
      }
      selected = template;
      reset(template);
      if (draft !== undefined) {
        refreshContext(template, draft);
      }
      rerender();
      return true;
    },
    mount(parent, gate): void {
      if (selected === undefined || draft === undefined) {
        parent.replaceChildren();
        const message = document.createElement("p");
        message.textContent = errorCode === "UNKNOWN_EVENT_TYPE"
          ? "Unknown event type."
          : "Select an event to begin.";
        parent.append(message);
        return;
      }
      context = readContext(selected, draft);
      draft = selected.updateFormState(
        draft,
        "__context_refresh__",
        undefined,
        context,
      );
      const issues = selected.validate(draft, context);
      const draftReady = options.draftView().status === "CURRENT_SESSION_READY";
      const canAdd = (
        gate.authenticatedStaff
        && draftReady
        && !hasBlockingValidationIssue(issues)
      );
      selected.mount(parent, {
        draft,
        context,
        issues,
        canAdd,
        busy,
        errorCode,
        bedTransferFormalWriteEnabled: gate.bedTransferFormalWriteEnabled,
        onChange(field, value): void {
          if (!selected?.employeeEditableFields.includes(field) || draft === undefined) {
            return;
          }
          draft = selected.updateFormState(draft, field, value, context);
          options.onBusinessFieldChange?.();
          context = readContext(selected, draft);
          draft = selected.updateFormState(draft, field, draft[field], context);
          errorCode = undefined;
          refreshContext(selected, draft);
          rerender();
        },
        onRetryContext(): void {
          if (selected !== undefined && draft !== undefined) {
            refreshContext(selected, draft, true);
          }
        },
        onAdd(): void {
          if (busy || !canAdd || selected === undefined || draft === undefined) {
            return;
          }
          const activeTemplate = selected;
          const activeDraft = draft;
          const activeContext = context;
          busy = true;
          errorCode = undefined;
          rerender();
          void (async () => {
            try {
              const entryId = `employee-next-entry-${options.createId()}`;
              const entry = activeTemplate.buildDraftEntry(
                activeDraft,
                entryId,
                activeContext,
              );
              const existingSessionId = options.session()?.session_id;
              newSessionId ??= `employee-next-session-${options.createId()}`;
              const saved = await options.addToSession({
                sessionId: existingSessionId ?? newSessionId,
                entry,
              });
              if (saved) {
                reset(activeTemplate);
              } else {
                errorCode = "DRAFT_SAVE_FAILED";
              }
            } catch {
              errorCode = "DRAFT_BUILD_FAILED";
            } finally {
              busy = false;
              rerender();
            }
          })();
        },
      });
    },
    getSelectedEvent(): EmployeeEventId | undefined {
      return selected?.eventType;
    },
    getDraft(): Readonly<DraftRecord> | undefined {
      return draft === undefined ? undefined : Object.freeze({ ...draft });
    },
  };
  return Object.freeze(controller);
}

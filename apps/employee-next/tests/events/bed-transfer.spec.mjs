import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const bedTransferPath = resolve(
  employeeNextRoot,
  "src",
  "events",
  "bed-transfer",
  "index.ts",
);
const eventContractPath = resolve(
  employeeNextRoot,
  "src",
  "core",
  "event-contract.ts",
);
const gitDirectory = (
  await readFile(resolve(worktreeRoot, ".git"), "utf8")
).trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(
  resolve(sourceRepositoryRoot, "package.json"),
);
const esbuild = requireFromRepository("esbuild");
const ts = requireFromRepository("typescript");
const bedTransferSource = await readFile(bedTransferPath, "utf8");
const eventContractSource = await readFile(eventContractPath, "utf8");

const bundledModule = await esbuild.build({
  bundle: true,
  entryPoints: [bedTransferPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const bedTransferModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledModule.outputFiles[0].text).toString("base64")
  }`
);

const runtimeExports = [
  "EMPLOYEE_BED_TRANSFER_EVENT_ID",
  "EMPLOYEE_BED_TRANSFER_FEE_MODES",
  "EMPLOYEE_BED_TRANSFER_PAYMENT_METHODS",
  "EMPLOYEE_BED_TRANSFER_PRICE_DIFFERENCE_MODES",
  "EMPLOYEE_BED_TRANSFER_VALIDATION_CODES",
  "createEmployeeBedTransferEventContract",
  "isEmployeeBedTransferDraft",
  "isEmployeeBedTransferFeeMode",
  "isEmployeeBedTransferPaymentMethod",
  "isEmployeeBedTransferPriceDifferenceMode",
];
const feeModes = ["paid", "waived", "unpaid"];
const paymentMethods = ["cash", "bank", "mixed", "none"];
const differenceModes = ["none", "paid", "unpaid"];
const validationCodes = [
  "BED_TRANSFER_DRAFT_NOT_OBJECT",
  "BED_TRANSFER_FROM_BED_REQUIRED",
  "BED_TRANSFER_TO_BED_REQUIRED",
  "BED_TRANSFER_SAME_BED_NOT_ALLOWED",
  "BED_TRANSFER_334_FORBIDDEN",
  "BED_TRANSFER_DATE_REQUIRED",
  "BED_TRANSFER_DATE_INVALID",
  "BED_TRANSFER_REASON_REQUIRED",
  "BED_TRANSFER_COMPANY_SCOPE_REQUIRED",
  "BED_TRANSFER_CONTEXT_REQUIRED",
  "BED_TRANSFER_COMPANY_SCOPE_MISMATCH",
  "BED_TRANSFER_SOURCE_SNAPSHOT_UNAVAILABLE",
  "BED_TRANSFER_TARGET_SNAPSHOT_UNAVAILABLE",
  "BED_TRANSFER_SOURCE_ALREADY_TTLOCK_VACANT",
  "BED_TRANSFER_TARGET_NOT_TTLOCK_VACANT",
  "BED_TRANSFER_SOURCE_DEPOSIT_D_REQUIRED",
  "BED_TRANSFER_SOURCE_MMDD_REQUIRED",
  "BED_TRANSFER_RENT_COVERAGE_REQUIRED",
  "BED_TRANSFER_OPEN_ARREARS_REF_REQUIRED",
  "BED_TRANSFER_OPEN_ARREARS_AMOUNT_MISMATCH",
  "BED_TRANSFER_MULTIPLE_OPEN_ARREARS_UNSUPPORTED",
  "BED_TRANSFER_FEE_MODE_INVALID",
  "BED_TRANSFER_FEE_AMOUNT_INVALID",
  "BED_TRANSFER_FEE_PAYMENT_METHOD_REQUIRED",
  "BED_TRANSFER_FEE_DUE_DATE_REQUIRED",
  "BED_TRANSFER_FEE_WAIVER_REASON_REQUIRED",
  "BED_PRICE_DIFFERENCE_MODE_INVALID",
  "BED_PRICE_DIFFERENCE_AMOUNT_INVALID",
  "BED_PRICE_DIFFERENCE_PAYMENT_METHOD_REQUIRED",
  "BED_PRICE_DIFFERENCE_DUE_DATE_REQUIRED",
  "BED_PRICE_DIFFERENCE_REASON_REQUIRED",
  "BED_TRANSFER_PROVIDER_IDENTITY_FORBIDDEN",
  "BED_TRANSFER_BACKEND_FIELD_FORBIDDEN",
];

function sourceSnapshot(overrides = {}) {
  return {
    bedLabel: "144",
    companyScope: "homelink",
    snapshotAvailable: true,
    snapshotStale: false,
    snapshotAmbiguous: false,
    physicalBedStatus: "occupied",
    physicalBedStatusSource: "access_snapshot_no_E",
    parsedVacancyMarker: false,
    depositSnapshotAed: 500,
    depositSource: "access_snapshot_D",
    depositAmbiguous: false,
    firstStayMmdd: "0715",
    firstStayMmddConfirmed: true,
    rentCoverageStart: "2026-07-15",
    rentCoverageEnd: "2026-08-14",
    openArrears: [],
    ...overrides,
  };
}

function targetSnapshot(overrides = {}) {
  return {
    bedLabel: "122",
    companyScope: "homelink",
    snapshotAvailable: true,
    snapshotStale: false,
    snapshotAmbiguous: false,
    physicalBedStatus: "vacant",
    physicalBedStatusSource: "access_snapshot_E_marker",
    parsedVacancyMarker: true,
    depositSnapshotAed: null,
    depositSource: "unknown",
    depositAmbiguous: false,
    firstStayMmdd: "",
    firstStayMmddConfirmed: false,
    rentCoverageStart: "",
    rentCoverageEnd: "",
    openArrears: [],
    ...overrides,
  };
}

function validDraft(overrides = {}) {
  return {
    fromBed: "144",
    toBed: "122",
    transferDate: "2026-07-26",
    transferReason: "Operational transfer",
    companyScope: "homelink",
    sourceAccessSnapshot: sourceSnapshot(),
    targetAccessSnapshot: targetSnapshot(),
    arrearsCarryoverAccepted: false,
    cloudArrearsRef: "",
    carriedArrearsAmountAed: null,
    transferFeeMode: "paid",
    transferFeeAmountAed: 50,
    transferFeePaymentMethod: "cash",
    transferFeeDueDate: "",
    transferFeeWaiverReason: "",
    bedPriceDifferenceMode: "none",
    bedPriceDifferenceAmountAed: 0,
    bedPriceDifferencePaymentMethod: "none",
    bedPriceDifferenceDueDate: "",
    bedPriceDifferenceReason: "",
    finalNote: "",
    ...overrides,
  };
}

function codesFor(value) {
  return bedTransferModule
    .createEmployeeBedTransferEventContract()
    .validateDraft(value)
    .map((entry) => entry.code);
}

test("bed-transfer runtime success contract", () => {
  assert.deepEqual(Object.keys(bedTransferModule).sort(), runtimeExports);
  assert.equal(bedTransferModule.EMPLOYEE_BED_TRANSFER_EVENT_ID, "bed-transfer");
  assert.deepEqual(bedTransferModule.EMPLOYEE_BED_TRANSFER_FEE_MODES, feeModes);
  assert.deepEqual(
    bedTransferModule.EMPLOYEE_BED_TRANSFER_PAYMENT_METHODS,
    paymentMethods,
  );
  assert.deepEqual(
    bedTransferModule.EMPLOYEE_BED_TRANSFER_PRICE_DIFFERENCE_MODES,
    differenceModes,
  );
  assert.deepEqual(
    bedTransferModule.EMPLOYEE_BED_TRANSFER_VALIDATION_CODES,
    validationCodes,
  );
  assert.equal(validationCodes.length, 33);
  for (const value of [
    bedTransferModule.EMPLOYEE_BED_TRANSFER_FEE_MODES,
    bedTransferModule.EMPLOYEE_BED_TRANSFER_PAYMENT_METHODS,
    bedTransferModule.EMPLOYEE_BED_TRANSFER_PRICE_DIFFERENCE_MODES,
    bedTransferModule.EMPLOYEE_BED_TRANSFER_VALIDATION_CODES,
  ]) {
    assert.equal(Object.isFrozen(value), true);
  }

  const contract = bedTransferModule.createEmployeeBedTransferEventContract();
  assert.notEqual(
    contract,
    bedTransferModule.createEmployeeBedTransferEventContract(),
  );
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(contract.eventId, "bed-transfer");
  assert.equal(contract.displayName, "Bed Transfer");
  assert.deepEqual(contract.createInitialDraft(), {
    fromBed: "",
    toBed: "",
    transferDate: "",
    transferReason: "",
    companyScope: "",
    sourceAccessSnapshot: null,
    targetAccessSnapshot: null,
    arrearsCarryoverAccepted: false,
    cloudArrearsRef: "",
    carriedArrearsAmountAed: null,
    transferFeeMode: "paid",
    transferFeeAmountAed: 50,
    transferFeePaymentMethod: "cash",
    transferFeeDueDate: "",
    transferFeeWaiverReason: "",
    bedPriceDifferenceMode: "none",
    bedPriceDifferenceAmountAed: 0,
    bedPriceDifferencePaymentMethod: "none",
    bedPriceDifferenceDueDate: "",
    bedPriceDifferenceReason: "",
    finalNote: "",
  });
  assert.equal(Object.isFrozen(contract.createInitialDraft()), true);
  assert.equal(bedTransferModule.isEmployeeBedTransferFeeMode("paid"), true);
  assert.equal(bedTransferModule.isEmployeeBedTransferFeeMode("Paid"), false);
  assert.equal(
    bedTransferModule.isEmployeeBedTransferPaymentMethod("mixed"),
    true,
  );
  assert.equal(
    bedTransferModule.isEmployeeBedTransferPaymentMethod("card"),
    false,
  );
  assert.equal(
    bedTransferModule.isEmployeeBedTransferPriceDifferenceMode("unpaid"),
    true,
  );
  assert.equal(
    bedTransferModule.isEmployeeBedTransferPriceDifferenceMode("due"),
    false,
  );
  assert.equal(bedTransferModule.isEmployeeBedTransferDraft(validDraft()), true);
  const validIssues = contract.validateDraft(validDraft());
  assert.deepEqual(validIssues, []);
  assert.equal(Object.isFrozen(validIssues), true);

  const input = validDraft({
    transferReason: " Operational transfer ",
    finalNote: " local preview ",
  });
  const before = structuredClone(input);
  const submission = contract.buildSubmission(input);
  assert.deepEqual(input, before);
  assert.equal(submission.eventId, "bed-transfer");
  assert.equal(submission.schemaVersion, 1);
  assert.equal(submission.displayName, "Bed Transfer");
  assert.equal(submission.transferReason, "Operational transfer");
  assert.equal(submission.finalNote, "local preview");
  assert.deepEqual(submission.sourceBedContext, {
    bedLabel: "144",
    physicalBedStatus: "occupied",
    physicalBedStatusSource: "access_snapshot_no_E",
    firstStayMmdd: "0715",
    rentCoverageStart: "2026-07-15",
    rentCoverageEnd: "2026-08-14",
  });
  assert.deepEqual(submission.targetBedContext, {
    bedLabel: "122",
    physicalBedStatus: "vacant",
    physicalBedStatusSource: "access_snapshot_E_marker",
    parsedVacancyMarker: true,
  });
  assert.deepEqual(submission.rentCoverageCarryover, {
    start: "2026-07-15",
    end: "2026-08-14",
    source: "source_access_snapshot_context",
    mutationApplied: false,
  });
  assert.deepEqual(submission.depositCarryoverPreview, {
    sourceDepositSnapshotAed: 500,
    depositSource: "access_snapshot_D",
    depositAmountChanged: false,
    depositInGenerated: false,
    depositOutGenerated: false,
    currentDepositMutationAed: 0,
  });
  assert.deepEqual(submission.arrearsCarryoverPreview, {
    openArrearsCount: 0,
    carryoverRequired: false,
    cloudArrearsRef: null,
    carriedArrearsAmountAed: 0,
    closesArrears: false,
    arrearsMutationApplied: false,
  });
  assert.deepEqual(submission.transferFeePreview, {
    mode: "paid",
    declaredAmountAed: 50,
    paymentMethod: "cash",
    dueDate: null,
    waiverReason: null,
    financeMutationApplied: false,
  });
  assert.deepEqual(submission.bedPriceDifferencePreview, {
    mode: "none",
    declaredAmountAed: 0,
    paymentMethod: "none",
    dueDate: null,
    reason: null,
    financeMutationApplied: false,
  });
  assert.deepEqual(submission.accountingPreview, {
    rentIncomeAed: 0,
    depositReceivedAed: 0,
    depositRefundedAed: 0,
    arrearsRepaidAed: 0,
    expenseAed: 0,
    transferFeeDeclaredAed: 50,
    bedPriceDifferenceDeclaredAed: 0,
    financeMutationApplied: false,
    ledgerWriteApplied: false,
  });
  assert.deepEqual(submission.occupancyPreview, {
    transferDeclared: true,
    sourceBedVacancyMutationApplied: false,
    targetBedOccupancyMutationApplied: false,
    accessMutationApplied: false,
    ttlockMutationApplied: false,
    reason: "bed-transfer-module-does-not-write-production-occupancy",
  });
  assert.deepEqual(submission.reconciliationPreview, {
    sourceMustBeMarkedVacantAfterTransfer: true,
    targetMustBeMarkedOccupiedAfterTransfer: true,
    targetDepositDReconciliationRequired: true,
    arrearsCarryoverReconciliationRequired: false,
    financeReconciliationRequired: true,
    ownerTodoWriteApplied: false,
    syncStateWriteApplied: false,
    reason: "bed-transfer-does-not-write-production-sources",
  });

  const arrears = {
    cloudArrearsRef: "AR-CLOUD-001",
    remainingArrearsAed: 125.5,
    arrearsSource: "cloud_arrears",
  };
  const withArrears = contract.buildSubmission(validDraft({
    sourceAccessSnapshot: sourceSnapshot({ openArrears: [arrears] }),
    arrearsCarryoverAccepted: true,
    cloudArrearsRef: "AR-CLOUD-001",
    carriedArrearsAmountAed: 125.5,
  }));
  assert.deepEqual(withArrears.arrearsCarryoverPreview, {
    openArrearsCount: 1,
    carryoverRequired: true,
    cloudArrearsRef: "AR-CLOUD-001",
    carriedArrearsAmountAed: 125.5,
    closesArrears: false,
    arrearsMutationApplied: false,
  });

  const residualTarget = contract.buildSubmission(validDraft({
    sourceAccessSnapshot: sourceSnapshot({ depositSnapshotAed: 0 }),
    targetAccessSnapshot: targetSnapshot({
      depositSnapshotAed: 700,
      depositSource: "access_snapshot_D",
      firstStayMmdd: "0101",
      firstStayMmddConfirmed: true,
      rentCoverageStart: "2025-01-01",
      rentCoverageEnd: "2025-01-31",
    }),
  }));
  assert.equal(residualTarget.depositCarryoverPreview.sourceDepositSnapshotAed, 0);
  assert.equal(residualTarget.targetBedContext.parsedVacancyMarker, true);

  for (const method of ["cash", "bank", "mixed"]) {
    const paid = contract.buildSubmission(validDraft({
      transferFeePaymentMethod: method,
    }));
    assert.equal(paid.transferFeePreview.declaredAmountAed, 50);
    assert.equal(paid.transferFeePreview.paymentMethod, method);
  }
  const waived = contract.buildSubmission(validDraft({
    transferFeeMode: "waived",
    transferFeeAmountAed: 0,
    transferFeePaymentMethod: "none",
    transferFeeWaiverReason: " Approved waiver ",
  }));
  assert.equal(waived.transferFeePreview.waiverReason, "Approved waiver");
  const unpaid = contract.buildSubmission(validDraft({
    transferFeeMode: "unpaid",
    transferFeeAmountAed: 50,
    transferFeePaymentMethod: "none",
    transferFeeDueDate: "2026-08-01",
  }));
  assert.equal(unpaid.transferFeePreview.dueDate, "2026-08-01");

  for (const method of ["cash", "bank", "mixed"]) {
    const paidDifference = contract.buildSubmission(validDraft({
      bedPriceDifferenceMode: "paid",
      bedPriceDifferenceAmountAed: 75.25,
      bedPriceDifferencePaymentMethod: method,
      bedPriceDifferenceReason: "Higher bed price",
    }));
    assert.equal(
      paidDifference.bedPriceDifferencePreview.declaredAmountAed,
      75.25,
    );
    assert.equal(
      paidDifference.bedPriceDifferencePreview.paymentMethod,
      method,
    );
  }
  const unpaidDifference = contract.buildSubmission(validDraft({
    bedPriceDifferenceMode: "unpaid",
    bedPriceDifferenceAmountAed: 75.25,
    bedPriceDifferencePaymentMethod: "none",
    bedPriceDifferenceDueDate: "2026-08-01",
    bedPriceDifferenceReason: "Higher bed price",
  }));
  assert.equal(
    unpaidDifference.bedPriceDifferencePreview.dueDate,
    "2026-08-01",
  );

  for (const snapshot of [
    submission,
    submission.sourceBedContext,
    submission.targetBedContext,
    submission.rentCoverageCarryover,
    submission.depositCarryoverPreview,
    submission.arrearsCarryoverPreview,
    submission.transferFeePreview,
    submission.bedPriceDifferencePreview,
    submission.accountingPreview,
    submission.occupancyPreview,
    submission.reconciliationPreview,
  ]) {
    assert.equal(Object.isFrozen(snapshot), true);
  }
});

test("bed-transfer runtime fail-closed contract", () => {
  assert.deepEqual(codesFor(null), ["BED_TRANSFER_DRAFT_NOT_OBJECT"]);
  const stableIssue = bedTransferModule
    .createEmployeeBedTransferEventContract()
    .validateDraft(validDraft({ fromBed: "" }))[0];
  assert.deepEqual(stableIssue, {
    code: "BED_TRANSFER_FROM_BED_REQUIRED",
    message: "Source bed is required.",
    severity: "ERROR",
    field: "fromBed",
  });
  assert.equal(Object.isFrozen(stableIssue), true);
  const cases = [
    [validDraft({ fromBed: "" }), "BED_TRANSFER_FROM_BED_REQUIRED"],
    [validDraft({ toBed: "" }), "BED_TRANSFER_TO_BED_REQUIRED"],
    [validDraft({ toBed: "144" }), "BED_TRANSFER_SAME_BED_NOT_ALLOWED"],
    [validDraft({ fromBed: "334" }), "BED_TRANSFER_334_FORBIDDEN"],
    [validDraft({ toBed: "334" }), "BED_TRANSFER_334_FORBIDDEN"],
    [validDraft({ transferDate: "" }), "BED_TRANSFER_DATE_REQUIRED"],
    [validDraft({ transferDate: "26-07-2026" }), "BED_TRANSFER_DATE_INVALID"],
    [validDraft({ transferReason: "" }), "BED_TRANSFER_REASON_REQUIRED"],
    [validDraft({ companyScope: "" }), "BED_TRANSFER_COMPANY_SCOPE_REQUIRED"],
    [validDraft({ sourceAccessSnapshot: null }), "BED_TRANSFER_CONTEXT_REQUIRED"],
    [validDraft({ targetAccessSnapshot: null }), "BED_TRANSFER_CONTEXT_REQUIRED"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({ snapshotAvailable: false }),
    }), "BED_TRANSFER_SOURCE_SNAPSHOT_UNAVAILABLE"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({ snapshotStale: true }),
    }), "BED_TRANSFER_SOURCE_SNAPSHOT_UNAVAILABLE"],
    [validDraft({
      targetAccessSnapshot: targetSnapshot({ snapshotAmbiguous: true }),
    }), "BED_TRANSFER_TARGET_SNAPSHOT_UNAVAILABLE"],
    [validDraft({
      targetAccessSnapshot: targetSnapshot({
        physicalBedStatus: "unknown",
        physicalBedStatusSource: "unknown",
      }),
    }), "BED_TRANSFER_TARGET_SNAPSHOT_UNAVAILABLE"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({ companyScope: "other" }),
    }), "BED_TRANSFER_COMPANY_SCOPE_MISMATCH"],
    [validDraft({
      targetAccessSnapshot: targetSnapshot({ companyScope: "other" }),
    }), "BED_TRANSFER_COMPANY_SCOPE_MISMATCH"],
    [validDraft({
      sourceAccessSnapshot: targetSnapshot({ bedLabel: "144" }),
    }), "BED_TRANSFER_SOURCE_ALREADY_TTLOCK_VACANT"],
    [validDraft({
      targetAccessSnapshot: sourceSnapshot({ bedLabel: "122" }),
    }), "BED_TRANSFER_TARGET_NOT_TTLOCK_VACANT"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({ depositSnapshotAed: null }),
    }), "BED_TRANSFER_SOURCE_DEPOSIT_D_REQUIRED"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({ depositSnapshotAed: -1 }),
    }), "BED_TRANSFER_SOURCE_DEPOSIT_D_REQUIRED"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({ depositSnapshotAed: 1.001 }),
    }), "BED_TRANSFER_SOURCE_DEPOSIT_D_REQUIRED"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({ depositAmbiguous: true }),
    }), "BED_TRANSFER_SOURCE_DEPOSIT_D_REQUIRED"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({ firstStayMmdd: "" }),
    }), "BED_TRANSFER_SOURCE_MMDD_REQUIRED"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({ firstStayMmddConfirmed: false }),
    }), "BED_TRANSFER_SOURCE_MMDD_REQUIRED"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({ rentCoverageStart: "" }),
    }), "BED_TRANSFER_RENT_COVERAGE_REQUIRED"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({ rentCoverageEnd: "invalid" }),
    }), "BED_TRANSFER_RENT_COVERAGE_REQUIRED"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({
        openArrears: [{
          cloudArrearsRef: "AR-1",
          remainingArrearsAed: 100,
          arrearsSource: "cloud_arrears",
        }],
      }),
    }), "BED_TRANSFER_OPEN_ARREARS_REF_REQUIRED"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({
        openArrears: [{
          cloudArrearsRef: "AR-1",
          remainingArrearsAed: 100,
          arrearsSource: "cloud_arrears",
        }],
      }),
      arrearsCarryoverAccepted: true,
      cloudArrearsRef: "AR-WRONG",
      carriedArrearsAmountAed: 100,
    }), "BED_TRANSFER_OPEN_ARREARS_REF_REQUIRED"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({
        openArrears: [{
          cloudArrearsRef: "AR-1",
          remainingArrearsAed: 100,
          arrearsSource: "cloud_arrears",
        }],
      }),
      arrearsCarryoverAccepted: true,
      cloudArrearsRef: "AR-1",
      carriedArrearsAmountAed: 99,
    }), "BED_TRANSFER_OPEN_ARREARS_AMOUNT_MISMATCH"],
    [validDraft({
      sourceAccessSnapshot: sourceSnapshot({
        openArrears: [
          {
            cloudArrearsRef: "AR-1",
            remainingArrearsAed: 100,
            arrearsSource: "cloud_arrears",
          },
          {
            cloudArrearsRef: "AR-2",
            remainingArrearsAed: 200,
            arrearsSource: "cloud_arrears",
          },
        ],
      }),
    }), "BED_TRANSFER_MULTIPLE_OPEN_ARREARS_UNSUPPORTED"],
    [validDraft({ transferFeeMode: "complimentary" }), "BED_TRANSFER_FEE_MODE_INVALID"],
    [validDraft({ transferFeeAmountAed: 49 }), "BED_TRANSFER_FEE_AMOUNT_INVALID"],
    [validDraft({ transferFeePaymentMethod: "none" }), "BED_TRANSFER_FEE_PAYMENT_METHOD_REQUIRED"],
    [validDraft({
      transferFeeMode: "waived",
      transferFeeAmountAed: 50,
      transferFeePaymentMethod: "none",
      transferFeeWaiverReason: "waived",
    }), "BED_TRANSFER_FEE_AMOUNT_INVALID"],
    [validDraft({
      transferFeeMode: "waived",
      transferFeeAmountAed: 0,
      transferFeePaymentMethod: "none",
    }), "BED_TRANSFER_FEE_WAIVER_REASON_REQUIRED"],
    [validDraft({
      transferFeeMode: "unpaid",
      transferFeeAmountAed: 49,
      transferFeePaymentMethod: "none",
      transferFeeDueDate: "2026-08-01",
    }), "BED_TRANSFER_FEE_AMOUNT_INVALID"],
    [validDraft({
      transferFeeMode: "unpaid",
      transferFeeAmountAed: 50,
      transferFeePaymentMethod: "cash",
      transferFeeDueDate: "2026-08-01",
    }), "BED_TRANSFER_FEE_PAYMENT_METHOD_REQUIRED"],
    [validDraft({
      transferFeeMode: "unpaid",
      transferFeeAmountAed: 50,
      transferFeePaymentMethod: "none",
    }), "BED_TRANSFER_FEE_DUE_DATE_REQUIRED"],
    [validDraft({ bedPriceDifferenceMode: "waived" }), "BED_PRICE_DIFFERENCE_MODE_INVALID"],
    [validDraft({ bedPriceDifferenceAmountAed: 1 }), "BED_PRICE_DIFFERENCE_AMOUNT_INVALID"],
    [validDraft({
      bedPriceDifferencePaymentMethod: "cash",
    }), "BED_PRICE_DIFFERENCE_PAYMENT_METHOD_REQUIRED"],
    [validDraft({
      bedPriceDifferenceDueDate: "2026-08-01",
    }), "BED_PRICE_DIFFERENCE_DUE_DATE_REQUIRED"],
    [validDraft({
      bedPriceDifferenceMode: "paid",
      bedPriceDifferenceAmountAed: 0,
      bedPriceDifferencePaymentMethod: "cash",
      bedPriceDifferenceReason: "price",
    }), "BED_PRICE_DIFFERENCE_AMOUNT_INVALID"],
    [validDraft({
      bedPriceDifferenceMode: "paid",
      bedPriceDifferenceAmountAed: 10,
      bedPriceDifferencePaymentMethod: "none",
      bedPriceDifferenceReason: "price",
    }), "BED_PRICE_DIFFERENCE_PAYMENT_METHOD_REQUIRED"],
    [validDraft({
      bedPriceDifferenceMode: "paid",
      bedPriceDifferenceAmountAed: 10,
      bedPriceDifferencePaymentMethod: "cash",
      bedPriceDifferenceDueDate: "2026-08-01",
      bedPriceDifferenceReason: "price",
    }), "BED_PRICE_DIFFERENCE_DUE_DATE_REQUIRED"],
    [validDraft({
      bedPriceDifferenceMode: "unpaid",
      bedPriceDifferenceAmountAed: 10,
      bedPriceDifferencePaymentMethod: "cash",
      bedPriceDifferenceDueDate: "2026-08-01",
      bedPriceDifferenceReason: "price",
    }), "BED_PRICE_DIFFERENCE_PAYMENT_METHOD_REQUIRED"],
    [validDraft({
      bedPriceDifferenceMode: "unpaid",
      bedPriceDifferenceAmountAed: 10,
      bedPriceDifferencePaymentMethod: "none",
      bedPriceDifferenceReason: "price",
    }), "BED_PRICE_DIFFERENCE_DUE_DATE_REQUIRED"],
    [validDraft({
      bedPriceDifferenceMode: "unpaid",
      bedPriceDifferenceAmountAed: 10,
      bedPriceDifferencePaymentMethod: "none",
      bedPriceDifferenceDueDate: "2026-08-01",
    }), "BED_PRICE_DIFFERENCE_REASON_REQUIRED"],
  ];
  for (const [value, code] of cases) {
    assert.ok(codesFor(value).includes(code), `${code}: ${JSON.stringify(value)}`);
  }

  const forbiddenFields = [
    "providerPhone", "phone", "creatorPhone", "cardId", "tenantCardId",
    "ttlockId", "oldTtlockRef", "old_ttlock_ref", "newTtlockRef",
    "customerName", "tenantName", "cardName", "previewText", "whatsappText",
    "localCache", "providerMetadata", "rentAmountAed", "amountDueAed",
    "arrearsPaymentAmountAed", "depositAmountAed", "refundAmountAed",
    "checkoutDate", "checkoutMode", "expenseCategory", "vacancyStatus",
    "occupancyMutation", "event_type", "type", "endpoint", "url", "headers",
    "token", "authorization", "idempotencyKey", "financeLedgerId",
    "ownerHistoryId", "canonicalAnchorId", "transferAnchorId", "lineageId",
    "syncStateId", "ttlockWritePlan", "backendPayload",
  ];
  for (const field of forbiddenFields) {
    const codes = codesFor({ ...validDraft(), [field]: "secret" });
    assert.ok(codes.includes("BED_TRANSFER_PROVIDER_IDENTITY_FORBIDDEN"), field);
    assert.ok(codes.includes("BED_TRANSFER_BACKEND_FIELD_FORBIDDEN"), field);
  }
  for (const field of ["providerPhone", "endpoint", "event_type"]) {
    const nested = validDraft({
      sourceAccessSnapshot: {
        ...sourceSnapshot(),
        [field]: "secret",
      },
    });
    const codes = codesFor(nested);
    assert.ok(codes.includes("BED_TRANSFER_PROVIDER_IDENTITY_FORBIDDEN"), field);
    assert.ok(codes.includes("BED_TRANSFER_BACKEND_FIELD_FORBIDDEN"), field);
  }
  for (const invalid of [
    null,
    validDraft({ fromBed: "334" }),
    { ...validDraft(), token: "SECRET-TOKEN" },
  ]) {
    assert.throws(
      () => bedTransferModule
        .createEmployeeBedTransferEventContract()
        .buildSubmission(invalid),
      (error) => (
        error.message === "EMPLOYEE_BED_TRANSFER_INVALID_DRAFT"
        && !/SECRET|TOKEN|334|144|122/u.test(error.message)
      ),
    );
  }
});

function semanticDiagnosticsFor(source) {
  const virtualFileName = resolve(
    employeeNextRoot,
    "tests",
    "bed-transfer-fixture.ts",
  );
  const compilerOptions = {
    strict: true,
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
  };
  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (fileName) => (
    [virtualFileName, bedTransferPath, eventContractPath]
      .some((candidate) => resolve(fileName) === candidate)
    || ts.sys.fileExists(fileName)
  );
  host.readFile = (fileName) => {
    if (resolve(fileName) === virtualFileName) return source;
    if (resolve(fileName) === bedTransferPath) return bedTransferSource;
    if (resolve(fileName) === eventContractPath) return eventContractSource;
    return ts.sys.readFile(fileName);
  };
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    if (resolve(fileName) === virtualFileName) {
      return ts.createSourceFile(
        fileName,
        source,
        languageVersion,
        true,
        ts.ScriptKind.TS,
      );
    }
    if (resolve(fileName) === bedTransferPath) {
      return ts.createSourceFile(
        fileName,
        bedTransferSource,
        languageVersion,
        true,
        ts.ScriptKind.TS,
      );
    }
    if (resolve(fileName) === eventContractPath) {
      return ts.createSourceFile(
        fileName,
        eventContractSource,
        languageVersion,
        true,
        ts.ScriptKind.TS,
      );
    }
    return originalGetSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreate,
    );
  };
  const program = ts.createProgram([virtualFileName], compilerOptions, host);
  return ts.getPreEmitDiagnostics(program);
}

test("bed-transfer TypeScript semantic fixtures", () => {
  const imports = `import {
    createEmployeeBedTransferEventContract,
    type EmployeeBedTransferAccessSnapshot,
    type EmployeeBedTransferArrearsSnapshot,
    type EmployeeBedTransferDraft,
    type EmployeeBedTransferEventContract,
    type EmployeeBedTransferFeeMode,
    type EmployeeBedTransferPaymentMethod,
    type EmployeeBedTransferPriceDifferenceMode,
    type EmployeeBedTransferSubmission,
  } from "../src/events/bed-transfer/index";
  import type { EmployeeEventContract } from "../src/core/event-contract";`;
  const validSnapshot = `{
    bedLabel: "144",
    companyScope: "homelink",
    snapshotAvailable: true,
    snapshotStale: false,
    snapshotAmbiguous: false,
    physicalBedStatus: "occupied",
    physicalBedStatusSource: "access_snapshot_no_E",
    parsedVacancyMarker: false,
    depositSnapshotAed: 500,
    depositSource: "access_snapshot_D",
    depositAmbiguous: false,
    firstStayMmdd: "0715",
    firstStayMmddConfirmed: true,
    rentCoverageStart: "2026-07-15",
    rentCoverageEnd: "2026-08-14",
    openArrears: []
  }`;
  const targetSnapshotText = `{
    ...${validSnapshot},
    bedLabel: "122",
    physicalBedStatus: "vacant",
    physicalBedStatusSource: "access_snapshot_E_marker",
    parsedVacancyMarker: true,
    depositSnapshotAed: null,
    depositSource: "unknown",
    firstStayMmdd: "",
    firstStayMmddConfirmed: false,
    rentCoverageStart: "",
    rentCoverageEnd: ""
  }`;
  const validDraftText = `{
    fromBed: "144",
    toBed: "122",
    transferDate: "2026-07-26",
    transferReason: "move",
    companyScope: "homelink",
    sourceAccessSnapshot: ${validSnapshot},
    targetAccessSnapshot: ${targetSnapshotText},
    arrearsCarryoverAccepted: false,
    cloudArrearsRef: "",
    carriedArrearsAmountAed: null,
    transferFeeMode: "paid",
    transferFeeAmountAed: 50,
    transferFeePaymentMethod: "cash",
    transferFeeDueDate: "",
    transferFeeWaiverReason: "",
    bedPriceDifferenceMode: "none",
    bedPriceDifferenceAmountAed: 0,
    bedPriceDifferencePaymentMethod: "none",
    bedPriceDifferenceDueDate: "",
    bedPriceDifferenceReason: "",
    finalNote: ""
  }`;
  const positives = [
    `${imports} const value: EmployeeBedTransferFeeMode = "paid"; void value;`,
    `${imports} const value: EmployeeBedTransferPaymentMethod = "mixed"; void value;`,
    `${imports} const value: EmployeeBedTransferPriceDifferenceMode = "none"; void value;`,
    `${imports} const value: EmployeeBedTransferAccessSnapshot = ${validSnapshot}; void value;`,
    `${imports} const value: EmployeeBedTransferArrearsSnapshot = { cloudArrearsRef: "AR-1", remainingArrearsAed: 10, arrearsSource: "cloud_arrears" }; void value;`,
    `${imports} const value: EmployeeBedTransferDraft = ${validDraftText}; void value;`,
    `${imports} declare const value: EmployeeBedTransferSubmission; const id: "bed-transfer" = value.eventId; void id;`,
    `${imports} const value: EmployeeBedTransferEventContract = createEmployeeBedTransferEventContract(); void value;`,
    `${imports} const value: EmployeeEventContract<EmployeeBedTransferDraft, EmployeeBedTransferSubmission> = createEmployeeBedTransferEventContract(); void value;`,
    `${imports} const value: EmployeeBedTransferSubmission = createEmployeeBedTransferEventContract().buildSubmission(${validDraftText}); void value;`,
    `${imports} declare const value: EmployeeBedTransferSubmission; const zero: 0 = value.accountingPreview.rentIncomeAed; void zero;`,
    `${imports} declare const value: EmployeeBedTransferSubmission; const zero: 0 = value.accountingPreview.depositReceivedAed; void zero;`,
    `${imports} declare const value: EmployeeBedTransferSubmission; const zero: 0 = value.accountingPreview.arrearsRepaidAed; void zero;`,
    `${imports} declare const value: EmployeeBedTransferSubmission; const zero: 0 = value.accountingPreview.expenseAed; void zero;`,
    `${imports} declare const value: EmployeeBedTransferSubmission; const applied: false = value.accountingPreview.financeMutationApplied; void applied;`,
    `${imports} declare const value: EmployeeBedTransferSubmission; const applied: false = value.accountingPreview.ledgerWriteApplied; void applied;`,
    `${imports} declare const value: EmployeeBedTransferSubmission; const applied: false = value.occupancyPreview.ttlockMutationApplied; void applied;`,
  ];
  for (const source of positives) {
    assert.deepEqual(semanticDiagnosticsFor(source), []);
  }

  const negatives = [
    [`${imports} const value: EmployeeBedTransferFeeMode = "free";`, /free/u],
    [`${imports} const value: EmployeeBedTransferPaymentMethod = "card";`, /card/u],
    [`${imports} const value: EmployeeBedTransferPriceDifferenceMode = "waived";`, /waived/u],
    [`${imports} const value: EmployeeBedTransferAccessSnapshot = { bedLabel: "1" };`, /companyScope/u],
    [`${imports} const value: EmployeeBedTransferArrearsSnapshot = { cloudArrearsRef: "x", remainingArrearsAed: 1, arrearsSource: "manual" };`, /manual/u],
    [`${imports} const { fromBed, ...rest } = ${validDraftText}; const value: EmployeeBedTransferDraft = rest;`, /fromBed/u],
    [`${imports} const value: EmployeeBedTransferDraft = { ...${validDraftText}, transferFeeAmountAed: "50" };`, /string/u],
    [`${imports} const value: EmployeeBedTransferDraft = { ...${validDraftText}, providerPhone: "x" };`, /providerPhone/u],
    [`${imports} const value: EmployeeBedTransferDraft = { ...${validDraftText}, rentAmountAed: 1 };`, /rentAmountAed/u],
    [`${imports} const value: EmployeeBedTransferDraft = { ...${validDraftText}, event_type: "TF" };`, /event_type/u],
    [`${imports} const value: EmployeeBedTransferDraft = { ...${validDraftText}, endpoint: "/x" };`, /endpoint/u],
    [`${imports} const value: EmployeeBedTransferSubmission = { schemaVersion: 1 };`, /eventId/u],
    [`${imports} declare const value: EmployeeBedTransferSubmission; const id: "rent" = value.eventId;`, /bed-transfer/u],
    [`${imports} declare const value: EmployeeBedTransferSubmission; const wire = value.event_type;`, /event_type/u],
    [`${imports} declare const value: EmployeeBedTransferSubmission; const invalid: 1 = value.accountingPreview.rentIncomeAed;`, /0/u],
    [`${imports} declare const value: EmployeeBedTransferSubmission; const invalid: true = value.accountingPreview.financeMutationApplied;`, /false/u],
    [`${imports} declare const value: EmployeeBedTransferSubmission; const invalid: true = value.accountingPreview.ledgerWriteApplied;`, /false/u],
    [`${imports} declare const value: EmployeeBedTransferSubmission; const invalid: true = value.occupancyPreview.sourceBedVacancyMutationApplied;`, /false/u],
    [`${imports} declare const value: EmployeeBedTransferSubmission; const invalid: true = value.occupancyPreview.targetBedOccupancyMutationApplied;`, /false/u],
    [`${imports} declare const value: EmployeeBedTransferSubmission; const invalid: true = value.occupancyPreview.accessMutationApplied;`, /false/u],
    [`${imports} declare const value: EmployeeBedTransferSubmission; const invalid: true = value.occupancyPreview.ttlockMutationApplied;`, /false/u],
    [`${imports} const value: EmployeeBedTransferEventContract = { eventId: "bed-transfer", displayName: "Bed Transfer", createInitialDraft() { return ${validDraftText}; }, validateDraft() { return []; } };`, /buildSubmission/u],
    [`${imports} const value: EmployeeBedTransferEventContract = { ...createEmployeeBedTransferEventContract(), buildSubmission: async () => ({}) };`, /Promise/u],
  ];
  for (const [source, expected] of negatives) {
    const diagnostics = semanticDiagnosticsFor(source);
    assert.ok(diagnostics.length > 0, source);
    const text = diagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    ).join("\n");
    assert.match(text, expected, source);
  }
});

test("bed-transfer source boundary excludes integrations and other events", async () => {
  assert.match(bedTransferSource, /from "\.\.\/\.\.\/core\/event-contract"/u);
  assert.doesNotMatch(
    bedTransferSource,
    /core\/(?:auth|api-client|draft-store|submit-entry|event-registry)|\.\.\/(?:rent|arrears-payment|deposit-in|deposit-out|checkout|expense)|\.\.\/\.\.\/ui\/|\.\.\/\.\.\/main/u,
  );
  assert.doesNotMatch(
    bedTransferSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|document|window|navigator|location|cookie|setTimeout|setInterval|Date\.now|process\.env|wrangler|cloudflare)\b|\/api\//iu,
  );
  assert.doesNotMatch(
    bedTransferSource,
    /providerPhone|tenantCardId|oldTtlockRef|customerName|tenantName|previewText|whatsappText|event_type|endpoint|authorization|idempotencyKey|financeLedgerId|ownerHistoryId|canonicalAnchorId|transferAnchorId|lineageId|syncStateId|ttlockWritePlan|backendPayload/iu,
  );
  assert.doesNotMatch(
    bedTransferSource,
    /createEmployeeEventRegistry|register|singleton|default\s+export|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM/iu,
  );
  for (const [directory, marker] of [
    ["rent", "EMPLOYEE_RENT_EVENT_ID"],
    ["arrears-payment", "EMPLOYEE_ARREARS_PAYMENT_EVENT_ID"],
    ["deposit-in", "EMPLOYEE_DEPOSIT_IN_EVENT_ID"],
    ["deposit-out", "EMPLOYEE_DEPOSIT_OUT_EVENT_ID"],
    ["checkout", "EMPLOYEE_CHECKOUT_EVENT_ID"],
    ["expense", "EMPLOYEE_EXPENSE_EVENT_ID"],
  ]) {
    const source = await readFile(
      resolve(employeeNextRoot, "src", "events", directory, "index.ts"),
      "utf8",
    );
    assert.match(source, new RegExp(marker, "u"));
  }
});

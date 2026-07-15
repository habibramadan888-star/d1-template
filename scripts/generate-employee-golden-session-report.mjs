import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function goldenSessionReportPath() {
  return path.join(os.tmpdir(), "homelink-employee-seven-event-golden-session-report.json");
}

export function goldenSessionHumanLines(report) {
  return [
    `SEVEN_EVENT_GOLDEN_SESSION: ${report.pass ? "PASS" : "FAIL"}`,
    `SCENARIO_COUNT: ${report.scenario_count}`,
    `VALIDATION_RESULT_COUNT: ${report.aggregate_result_count}`,
    `FORMAL_WRITE_COUNT: ${report.formal_write_count}`,
    `IDEMPOTENT_RETRY_NEW_WRITES: ${report.idempotent_retry_new_writes}`,
    `CROSS_EVENT_ERROR_COUNT: ${report.cross_event_error_count}`,
    `DUPLICATE_ANCHOR_COUNT: ${report.duplicate_anchor_count}`,
    `FINANCE_RESULT: ${report.finance_result}`,
    `OWNER_HISTORY_RESULT: ${report.owner_history_result}`,
    `PARTIAL_RESUME_RESULT: ${report.partial_resume_result}`,
    `AUTH_STABILITY_RESULT: ${report.auth_stability_result}`,
    `TTLOCK_EXTERNAL_CALLS: ${report.ttlock_external_calls}`,
    `REPORT_JSON: ${report.report_path}`,
  ];
}

export async function writeGoldenSessionReport(report, outputPath = goldenSessionReportPath()) {
  const complete = { ...report, report_path: outputPath };
  await writeFile(outputPath, `${JSON.stringify(complete, null, 2)}\n`, "utf8");
  return complete;
}

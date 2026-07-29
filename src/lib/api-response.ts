import { ErrorCodes, type ErrorCode } from "../constants/error-codes.ts";
import type { StandardErrorResponse, StandardResponse } from "../types/api.ts";

export function ok<T>(data: T, message = "success"): StandardResponse<T> {
  return {
    code: 0,
    message,
    data
  };
}

export function fail(
  code: ErrorCode = ErrorCodes.INTERNAL_SERVER,
  message = "Internal server error",
  error?: string
): StandardErrorResponse {
  return {
    code,
    message,
    ...(error ? { error } : {})
  };
}

import { ErrorCodes } from "../constants/error-codes.ts";
import { fail, ok } from "../lib/api-response.ts";
import { logger } from "../lib/logger.ts";
import type { StandardErrorResponse, StandardResponse } from "../types/api.ts";

export interface CurrentUser {
  userid: string;
  role: "employee" | "manager" | "readonly_admin";
}

export function buildCurrentUserResponse(
  user: CurrentUser | null
): StandardResponse<CurrentUser> | StandardErrorResponse {
  if (!user) {
    logger.info({ operation: "auth.current_user", result: "unauthorized" });
    return fail(ErrorCodes.UNAUTHORIZED, "Unauthorized");
  }

  logger.info({ operation: "auth.current_user", userid: user.userid, role: user.role });
  return ok(user);
}

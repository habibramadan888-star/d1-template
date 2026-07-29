import { ErrorCodes } from "../constants/error-codes.js";
import { fail, ok } from "../lib/api-response.js";
import { logger } from "../lib/logger.js";
export function buildCurrentUserResponse(user) {
    if (!user) {
        logger.info({ operation: "auth.current_user", result: "unauthorized" });
        return fail(ErrorCodes.UNAUTHORIZED, "Unauthorized");
    }
    logger.info({ operation: "auth.current_user", userid: user.userid, role: user.role });
    return ok(user);
}

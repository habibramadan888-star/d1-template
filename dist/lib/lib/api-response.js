import { ErrorCodes } from "../constants/error-codes.js";
export function ok(data, message = "success") {
    return {
        code: 0,
        message,
        data
    };
}
export function fail(code = ErrorCodes.INTERNAL_SERVER, message = "Internal server error", error) {
    return {
        code,
        message,
        ...(error ? { error } : {})
    };
}

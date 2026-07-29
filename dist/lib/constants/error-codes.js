export const ErrorCodes = Object.freeze({
    // General errors 1xxx
    BAD_REQUEST: 1000,
    UNAUTHORIZED: 1001,
    FORBIDDEN: 1002,
    NOT_FOUND: 1003,
    INTERNAL_SERVER: 1500,
    // Business errors 2xxx
    USER_NOT_EXIST: 2001,
    USER_ALREADY_EXISTS: 2002,
    INVALID_CREDENTIALS: 2003
});

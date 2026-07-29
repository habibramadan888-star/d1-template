function createRequestId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
export function requestIdMiddleware(req, res, next) {
    const incoming = req.headers["x-request-id"];
    req.id = Array.isArray(incoming)
        ? incoming[0] || createRequestId()
        : incoming || createRequestId();
    res.setHeader("x-request-id", req.id);
    next();
}

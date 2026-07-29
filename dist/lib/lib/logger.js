const processEnv = typeof process === "undefined" || !process.env ? {} : process.env;
const configuredLevel = (processEnv.LOG_LEVEL || "info").toLowerCase();
const levelWeights = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40
};
function shouldLog(level) {
    return levelWeights[level] >= (levelWeights[configuredLevel] || levelWeights.info);
}
function normalizeLogArgs(args) {
    const [first, second] = args;
    if (first && typeof first === "object" && !Array.isArray(first)) {
        return {
            context: first,
            message: typeof second === "string" ? second : ""
        };
    }
    return {
        context: {},
        message: typeof first === "string" ? first : String(first || "")
    };
}
function serializeError(value) {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack
        };
    }
    return value;
}
function writeLog(level, baseContext, args) {
    if (!shouldLog(level))
        return;
    const { context, message } = normalizeLogArgs(args);
    const entry = {
        level,
        time: new Date().toISOString(),
        ...baseContext,
        ...context,
        message
    };
    if ("err" in entry)
        entry.err = serializeError(entry.err);
    const line = JSON.stringify(entry);
    if (level === "error") {
        console.error(line);
    }
    else if (level === "warn") {
        console.warn(line);
    }
    else {
        console.log(line);
    }
}
function createLogger(baseContext = {}) {
    return {
        child(context) {
            return createLogger({ ...baseContext, ...context });
        },
        debug(...args) {
            writeLog("debug", baseContext, args);
        },
        info(...args) {
            writeLog("info", baseContext, args);
        },
        warn(...args) {
            writeLog("warn", baseContext, args);
        },
        error(...args) {
            writeLog("error", baseContext, args);
        }
    };
}
export const logger = createLogger();
export const httpLogger = (req, res, next) => {
    logger.info({ req: Boolean(req), res: Boolean(res) }, "HTTP request");
    next();
};

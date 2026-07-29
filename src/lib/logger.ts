type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const processEnv =
  typeof process === "undefined" || !process.env ? {} : (process.env as Record<string, string>);
const configuredLevel = (processEnv.LOG_LEVEL || "info").toLowerCase() as LogLevel;
const levelWeights: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function shouldLog(level: LogLevel): boolean {
  return levelWeights[level] >= (levelWeights[configuredLevel] || levelWeights.info);
}

function normalizeLogArgs(args: unknown[]): { context: LogContext; message: string } {
  const [first, second] = args;
  if (first && typeof first === "object" && !Array.isArray(first)) {
    return {
      context: first as LogContext,
      message: typeof second === "string" ? second : ""
    };
  }
  return {
    context: {},
    message: typeof first === "string" ? first : String(first || "")
  };
}

function serializeError(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }
  return value;
}

function writeLog(level: LogLevel, baseContext: LogContext, args: unknown[]): void {
  if (!shouldLog(level)) return;
  const { context, message } = normalizeLogArgs(args);
  const entry: LogContext = {
    level,
    time: new Date().toISOString(),
    ...baseContext,
    ...context,
    message
  };

  if ("err" in entry) entry.err = serializeError(entry.err);
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export interface StructuredLogger {
  child(context: LogContext): StructuredLogger;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

function createLogger(baseContext: LogContext = {}): StructuredLogger {
  return {
    child(context: LogContext) {
      return createLogger({ ...baseContext, ...context });
    },
    debug(...args: unknown[]) {
      writeLog("debug", baseContext, args);
    },
    info(...args: unknown[]) {
      writeLog("info", baseContext, args);
    },
    warn(...args: unknown[]) {
      writeLog("warn", baseContext, args);
    },
    error(...args: unknown[]) {
      writeLog("error", baseContext, args);
    }
  };
}

export const logger = createLogger();

export const httpLogger = (req: unknown, res: unknown, next: () => void): void => {
  logger.info({ req: Boolean(req), res: Boolean(res) }, "HTTP request");
  next();
};

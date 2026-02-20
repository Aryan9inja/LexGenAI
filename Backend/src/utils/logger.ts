type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

const getTimestamp = () => new Date().toISOString();

const formatLog = (level: LogLevel, context: string, message: string, data?: unknown) => {
  const timestamp = getTimestamp();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
  return `[${timestamp}] [${level}] [${context}] ${message}${dataStr}`;
};

export const logger = {
  info: (context: string, message: string, data?: unknown) => {
    console.log(formatLog("INFO", context, message, data));
  },

  warn: (context: string, message: string, data?: unknown) => {
    console.warn(formatLog("WARN", context, message, data));
  },

  error: (context: string, message: string, data?: unknown) => {
    console.error(formatLog("ERROR", context, message, data));
  },

  debug: (context: string, message: string, data?: unknown) => {
    if (process.env.DEBUG === "true") {
      console.debug(formatLog("DEBUG", context, message, data));
    }
  },
};

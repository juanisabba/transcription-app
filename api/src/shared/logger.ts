const log = (
  level: "error" | "warn" | "info" | "debug",
  message: string,
  meta?: Record<string, unknown>
) => {
  const payload = meta ? { ...meta, message } : { message };
  console[level](JSON.stringify({ level, ...payload }));
};

export const logger = {
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
};

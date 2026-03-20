import pino from "pino";

const isServer = globalThis.window === undefined;
const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  serializers: { err: pino.stdSerializers.err },
  ...(isServer && isDev && { transport: { target: "pino-pretty" } }),
});

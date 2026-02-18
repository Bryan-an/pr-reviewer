import "server-only";

import pino from "pino";

import { getEnv, LOG_LEVEL } from "@/lib/config/env";

export const logger = pino({
  level: getEnv().LOG_LEVEL ?? LOG_LEVEL.Info,
});

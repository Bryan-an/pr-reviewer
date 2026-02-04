import "server-only";

import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/prisma/generated/prisma/client";

function ensureDatabaseUrl() {
  if (typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim() !== "") {
    return;
  }

  const dbPath = path.resolve(".data", "pr-reviewer.sqlite");
  process.env.DATABASE_URL = `file:${dbPath}`;
}

declare global {
  var prisma: PrismaClient | undefined;
}

ensureDatabaseUrl();

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!,
});

export const prisma: PrismaClient = globalThis.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

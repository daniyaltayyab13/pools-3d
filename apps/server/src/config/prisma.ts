import { PrismaClient } from "@prisma/client";
import { env } from "./env";

/**
 * Prisma database client.
 *
 * Used by backend routes to read/write Railway Postgres.
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

import "dotenv/config";
import { z } from "zod";

/**
 * Server environment validation.
 *
 * We validate env at startup so deployment issues fail clearly.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().default(4000),

  /**
   * Comma-separated allowed frontend origins.
   *
   * Local:
   * FRONTEND_ORIGIN=http://localhost:3000
   *
   * Production:
   * FRONTEND_ORIGIN=https://pools-3d.vercel.app
   */
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  
  /**
   * Public frontend URL.
   *
   * Used by backend when returning URLs for public frontend assets,
   * for example static USDZ files served from apps/web/public.
  */
  FRONTEND_PUBLIC_URL: z.string().url().default("http://localhost:3000"),

  /**
   * PostgreSQL connection string.
   *
   * Used by Prisma to connect to Railway Postgres.
   */
  DATABASE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);

export const allowedOrigins = env.FRONTEND_ORIGIN.split(",").map((origin) =>
  origin.trim()
);

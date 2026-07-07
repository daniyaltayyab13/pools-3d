"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedOrigins = exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
/**
 * Server environment validation.
 *
 * We validate env at startup so deployment issues fail clearly.
 */
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    /**
     * Comma-separated allowed frontend origins.
     *
     * Local:
     * FRONTEND_ORIGIN=http://localhost:3000
     *
     * Production:
     * FRONTEND_ORIGIN=https://pools-3d.vercel.app
     */
    FRONTEND_ORIGIN: zod_1.z.string().default("http://localhost:3000"),
    /**
     * Public frontend URL.
     *
     * Used by backend when returning URLs for public frontend assets,
     * for example static USDZ files served from apps/web/public.
    */
    FRONTEND_PUBLIC_URL: zod_1.z.string().url().default("http://localhost:3000"),
});
exports.env = envSchema.parse(process.env);
exports.allowedOrigins = exports.env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim());

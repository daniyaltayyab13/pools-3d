"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.designConfigSchema = void 0;
const zod_1 = require("zod");
/**
 * Design config validation schema.
 *
 * This is the backend contract for one pool design.
 * Later, iPhone USDZ generation will use this exact payload.
 */
exports.designConfigSchema = zod_1.z.object({
    version: zod_1.z.literal(1),
    shape: zod_1.z.literal("rectangular"),
    dimensions: zod_1.z.object({
        length: zod_1.z.number().min(5).max(12),
        width: zod_1.z.number().min(2.5).max(6),
        depth: zod_1.z.number().min(1).max(2.5),
    }),
    materials: zod_1.z.object({
        poolTile: zod_1.z.enum(["brightAzure", "deepNavy"]),
        coping: zod_1.z.enum(["silverGrey"]),
        deck: zod_1.z.enum(["greige"]),
        water: zod_1.z.enum(["caribbean", "azure", "midnight", "emerald"]),
    }),
    source: zod_1.z.enum(["studio", "ar", "pwa"]).default("studio"),
});

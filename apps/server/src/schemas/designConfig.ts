import { z } from "zod";

/**
 * Design config validation schema.
 *
 * This is the backend contract for one pool design.
 * Later, iPhone USDZ generation will use this exact payload.
 */
export const designConfigSchema = z.object({
  version: z.literal(1),

  shape: z.literal("rectangular"),

  dimensions: z.object({
    length: z.number().min(5).max(12),
    width: z.number().min(2.5).max(6),
    depth: z.number().min(1).max(2.5),
  }),

  materials: z.object({
    poolTile: z.enum(["brightAzure", "deepNavy"]),
    coping: z.enum(["silverGrey"]),
    deck: z.enum(["greige"]),
    water: z.enum(["caribbean", "azure", "midnight", "emerald"]),
  }),

  source: z.enum(["studio", "ar", "pwa"]).default("studio"),
});

export type DesignConfig = z.infer<typeof designConfigSchema>;

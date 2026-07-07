import { randomUUID } from "node:crypto";
import { Router } from "express";
import { ZodError } from "zod";
import {
  designConfigSchema,
  type DesignConfig,
} from "../schemas/designConfig";

/**
 * Design routes.
 *
 * Current purpose:
 * - receive current pool design from frontend
 * - validate it
 * - return calculated preview summary
 *
 * Future purpose:
 * - save design to DB
 * - generate share links
 * - trigger iPhone USDZ conversion
 */
export const designsRouter = Router();

designsRouter.post("/preview", (request, response) => {
  try {
    const config = designConfigSchema.parse(request.body);

    const preview = buildDesignPreview(config);

    response.json({
      data: preview,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({
        data: null,
        error: {
          code: "DESIGN_VALIDATION_FAILED",
          message: "Design config is invalid.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });

      return;
    }

    response.status(500).json({
      data: null,
      error: {
        code: "DESIGN_PREVIEW_FAILED",
        message: "Could not create design preview.",
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * Builds a backend preview summary from a valid design config.
 *
 * This proves the server understands the design, not just receives random JSON.
 */
function buildDesignPreview(config: DesignConfig) {
  const { length, width, depth } = config.dimensions;

  const waterSurfaceArea = length * width;
  const approximateWaterVolume = length * width * depth;
  const deckFootprintArea = (length + 3.8) * (width + 3.8);

  return {
    previewId: randomUUID(),

    config,

    summary: {
      title: "Rectangular Pool Preview",
      dimensionsLabel: `${length.toFixed(1)}m × ${width.toFixed(
        1
      )}m × ${depth.toFixed(1)}m`,
      waterSurfaceAreaSqm: roundNumber(waterSurfaceArea),
      approximateWaterVolumeCbm: roundNumber(approximateWaterVolume),
      deckFootprintAreaSqm: roundNumber(deckFootprintArea),
    },

    ar: {
      androidWebXR: "ready",
      iPhoneQuickLook: "pending-usdz-converter",
      nextStep:
        "Use this validated design config to generate a clean USDZ file for iPhone AR.",
    },
  };
}

function roundNumber(value: number) {
  return Math.round(value * 100) / 100;
}

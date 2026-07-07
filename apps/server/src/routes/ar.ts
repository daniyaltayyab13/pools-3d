import { randomUUID } from "node:crypto";
import { Router } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import {
  designConfigSchema,
  type DesignConfig,
} from "../schemas/designConfig";

/**
 * AR routes.
 *
 * Current purpose:
 * - receive validated pool design config
 * - return iPhone Quick Look preview information
 * - use static USDZ fallback for now
 *
 * Future purpose:
 * - generate GLB/USDZ dynamically from design config
 * - cache generated USDZ files
 * - return final generated USDZ URL
 */
export const arRouter = Router();

arRouter.post("/iphone-preview", (request, response) => {
  try {
    const config = designConfigSchema.parse(request.body);

    const iphonePreview = buildIphonePreview(config);

    response.json({
      data: iphonePreview,
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
          code: "AR_DESIGN_VALIDATION_FAILED",
          message: "Design config is invalid for iPhone AR preview.",
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
        code: "IPHONE_AR_PREVIEW_FAILED",
        message: "Could not create iPhone AR preview.",
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * Builds iPhone AR preview response.
 *
 * Right now this returns a static demo USDZ file from the frontend public folder.
 * Later this function will call the USDZ generator/converter pipeline.
 */
function buildIphonePreview(config: DesignConfig) {
  const previewId = randomUUID();

  /**
   * This file should exist in:
   * apps/web/public/ar/demo-pool.usdz
   *
   * Browser URL:
   * http://localhost:3000/ar/demo-pool.usdz
   */
  const staticUsdzUrl = `${env.FRONTEND_PUBLIC_URL}/ar/demo-pool.usdz`;

  return {
    previewId,

    mode: "static-usdz-fallback",

    config,

    quickLook: {
      platform: "ios",
      fileFormat: "usdz",
      href: staticUsdzUrl,
      rel: "ar",
      status: "ready-with-static-fallback",
    },

    pipeline: {
      dynamicGeneration: "pending",
      currentStep:
        "API contract is ready. Next step is server-side USDZ generation.",
      futureOutputPath: `/generated/usdz/${previewId}.usdz`,
    },

    notes: [
      "This endpoint validates the current live pool design.",
      "The current USDZ URL is static for POC testing.",
      "Dynamic USDZ generation will replace this static URL later.",
    ],
  };
}

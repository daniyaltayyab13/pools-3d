import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { Router } from "express";
import { ZodError } from "zod";
import {
  createDynamicIphoneArAsset,
  createStaticIphoneArAsset,
} from "../services/arAssetService";
import {
  designConfigSchema,
  type DesignConfig,
} from "../schemas/designConfig";

/**
 * AR routes.
 *
 * Current purpose:
 * - receive validated pool design config
 * - create a server-hosted USDZ preview asset
 * - return iPhone Quick Look preview information
 *
 * Future purpose:
 * - generate GLB/USDZ dynamically from design config
 * - cache generated USDZ files
 * - return final generated USDZ URL
 */
export const arRouter = Router();

arRouter.post("/iphone-preview", async (request, response) => {
  try {
    const config = designConfigSchema.parse(request.body);

    const publicOrigin = getPublicOriginFromRequest(request);
    const iphonePreview = await buildIphonePreview(config, publicOrigin);

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
 * Step 17 behavior:
 * - first tries to generate a design-specific USDZ
 * - falls back to static template if dynamic generation fails
 */
async function buildIphonePreview(config: DesignConfig, publicOrigin: string) {
  const previewId = randomUUID();

  let generatedAsset;
  let mode: "dynamic-usdz-v1" | "server-static-usdz-fallback";
  let status: string;
  let currentStep: string;
  let notes: string[];

  try {
    generatedAsset = await createDynamicIphoneArAsset({
      previewId,
      config,
    });

    mode = "dynamic-usdz-v1";
    status = "ready-with-dynamic-usdz-v1";
    currentStep =
      "Backend generated a design-specific USDZ from pool dimensions/materials.";
    notes = [
      "This endpoint validates the current live pool design.",
      "The USDZ file is generated dynamically on the backend.",
      "This V1 model uses simple procedural geometry and solid colors.",
    ];
  } catch (error) {
    generatedAsset = await createStaticIphoneArAsset({
      previewId,
      config,
    });

    mode = "server-static-usdz-fallback";
    status = "ready-with-server-static-fallback";
    currentStep =
      "Dynamic USDZ generation failed, so backend returned the static fallback.";
    notes = [
      "This endpoint validates the current live pool design.",
      "Dynamic generation failed and fallback mode was used.",
      error instanceof Error ? error.message : "Unknown dynamic USDZ error.",
    ];
  }

  const generatedUsdzUrl = `${publicOrigin}${generatedAsset.relativeUrl}`;

  return {
    previewId,

    mode,

    config,

    quickLook: {
      platform: "ios",
      fileFormat: "usdz",
      href: generatedUsdzUrl,
      rel: "ar",
      status,
    },

    pipeline: {
      dynamicGeneration: mode === "dynamic-usdz-v1" ? "ready-v1" : "fallback",
      currentStep,
      futureOutputPath: generatedAsset.relativeUrl,
    },

    notes,
  };
}

/**
 * Resolves the public origin for generated asset URLs.
 *
 * Local:
 * http://localhost:4000
 *
 * Railway:
 * https://<railway-domain>
 */
function getPublicOriginFromRequest(request: Request) {
  const forwardedProto = request.get("x-forwarded-proto");
  const forwardedHost = request.get("x-forwarded-host");

  const protocol = forwardedProto?.split(",")[0]?.trim() ?? request.protocol;
  const host = forwardedHost?.split(",")[0]?.trim() ?? request.get("host");

  if (!host) {
    throw new Error("Could not resolve request host for public AR URL.");
  }

  return `${protocol}://${host}`;
}

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z, ZodError } from "zod";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import {
  designConfigSchema,
  type DesignConfig,
} from "../schemas/designConfig";

/**
 * Design routes.
 *
 * Current purpose:
 * - preview current design
 * - save current design to Postgres
 * - list saved designs
 * - get one saved design by id
 *
 * Future purpose:
 * - share links
 * - customer lead attachment
 * - admin dashboard
 */
export const designsRouter = Router();

const saveDesignSchema = designConfigSchema.extend({
  name: z.string().trim().min(1).max(80).optional(),
});

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
    handleRouteError(error, response, {
      validationCode: "DESIGN_VALIDATION_FAILED",
      validationMessage: "Design config is invalid.",
      fallbackCode: "DESIGN_PREVIEW_FAILED",
      fallbackMessage: "Could not create design preview.",
    });
  }
});

/**
 * Saves current pool design to Postgres.
 *
 * Endpoint:
 * POST /api/designs
 */
designsRouter.post("/", async (request, response) => {
  try {
    const parsed = saveDesignSchema.parse(request.body);

    const config: DesignConfig = {
      version: parsed.version,
      shape: parsed.shape,
      dimensions: parsed.dimensions,
      materials: parsed.materials,
      source: parsed.source,
    };

    const summary = buildDesignSummary(config);

    const savedDesign = await prisma.design.create({
      data: {
        name: parsed.name ?? null,
        shape: config.shape,
        length: config.dimensions.length,
        width: config.dimensions.width,
        depth: config.dimensions.depth,
        poolTile: config.materials.poolTile,
        coping: config.materials.coping,
        deck: config.materials.deck,
        water: config.materials.water,
        source: config.source,
        config: config as unknown as Prisma.InputJsonValue,
        previewSummary: summary as unknown as Prisma.InputJsonValue,
      },
    });

    response.status(201).json({
      data: {
        id: savedDesign.id,
        name: savedDesign.name,
        config,
        summary,
        createdAt: savedDesign.createdAt.toISOString(),
        updatedAt: savedDesign.updatedAt.toISOString(),
        futureSharePath: `/studio/design/${savedDesign.id}`,
        futureShareUrl: `${env.FRONTEND_PUBLIC_URL}/studio/design/${savedDesign.id}`,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleRouteError(error, response, {
      validationCode: "SAVE_DESIGN_VALIDATION_FAILED",
      validationMessage: "Design config is invalid and could not be saved.",
      fallbackCode: "SAVE_DESIGN_FAILED",
      fallbackMessage: "Could not save design.",
    });
  }
});

/**
 * Lists recently saved designs.
 *
 * Endpoint:
 * GET /api/designs
 */
designsRouter.get("/", async (_request, response) => {
  try {
    const savedDesigns = await prisma.design.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        name: true,
        shape: true,
        length: true,
        width: true,
        depth: true,
        poolTile: true,
        coping: true,
        deck: true,
        water: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    response.json({
      data: savedDesigns.map((design) => ({
        ...design,
        createdAt: design.createdAt.toISOString(),
        updatedAt: design.updatedAt.toISOString(),
      })),
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: "LIST_DESIGNS_FAILED",
        message: "Could not list saved designs.",
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * Gets one saved design by id.
 *
 * Endpoint:
 * GET /api/designs/:id
 */
designsRouter.get("/:id", async (request, response) => {
  try {
    const savedDesign = await prisma.design.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!savedDesign) {
      response.status(404).json({
        data: null,
        error: {
          code: "DESIGN_NOT_FOUND",
          message: "Design not found.",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });

      return;
    }

    response.json({
      data: {
        ...savedDesign,
        createdAt: savedDesign.createdAt.toISOString(),
        updatedAt: savedDesign.updatedAt.toISOString(),
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: "GET_DESIGN_FAILED",
        message: "Could not get saved design.",
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
});

function buildDesignPreview(config: DesignConfig) {
  return {
    previewId: randomUUID(),
    config,
    summary: buildDesignSummary(config),
    ar: {
      androidWebXR: "ready",
      iPhoneQuickLook: "hold-for-later",
      nextStep:
        "Saved designs can now be used for share links, leads, and admin dashboard.",
    },
  };
}

function buildDesignSummary(config: DesignConfig) {
  const { length, width, depth } = config.dimensions;

  const waterSurfaceArea = length * width;
  const approximateWaterVolume = length * width * depth;
  const deckFootprintArea = (length + 3.8) * (width + 3.8);

  return {
    title: "Rectangular Pool Preview",
    dimensionsLabel: `${length.toFixed(1)}m × ${width.toFixed(
      1
    )}m × ${depth.toFixed(1)}m`,
    waterSurfaceAreaSqm: roundNumber(waterSurfaceArea),
    approximateWaterVolumeCbm: roundNumber(approximateWaterVolume),
    deckFootprintAreaSqm: roundNumber(deckFootprintArea),
  };
}

function roundNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function handleRouteError(
  error: unknown,
  response: {
    status: (statusCode: number) => {
      json: (body: unknown) => void;
    };
  },
  messages: {
    validationCode: string;
    validationMessage: string;
    fallbackCode: string;
    fallbackMessage: string;
  }
) {
  if (error instanceof ZodError) {
    response.status(400).json({
      data: null,
      error: {
        code: messages.validationCode,
        message: messages.validationMessage,
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
      code: messages.fallbackCode,
      message: messages.fallbackMessage,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

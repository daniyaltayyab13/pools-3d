import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z, ZodError } from "zod";
import { prisma } from "../config/prisma";
import { designConfigSchema } from "../schemas/designConfig";

/**
 * Converts empty strings from forms into undefined.
 *
 * This allows optional form fields like email/city/message
 * to be submitted as empty strings without failing validation.
 */
const optionalTrimmedString = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmedValue = value.trim();

      return trimmedValue.length > 0 ? trimmedValue : undefined;
    },
    z.string().max(maxLength).optional()
  );

const createLeadSchema = z
  .object({
    customerName: z.string().trim().min(1).max(80),

    email: z.preprocess(
      (value) => {
        if (typeof value !== "string") {
          return value;
        }

        const trimmedValue = value.trim();

        return trimmedValue.length > 0 ? trimmedValue : undefined;
      },
      z.string().email().max(120).optional()
    ),

    phone: optionalTrimmedString(40),
    city: optionalTrimmedString(80),
    message: optionalTrimmedString(1000),

    /**
     * Optional saved design id.
     *
     * Current Step 23 can work without this because we submit
     * the current design config as JSON.
     *
     * Later we can attach this automatically from /studio/design/:id.
     */
    designId: z.string().uuid().optional(),

    config: designConfigSchema,

    source: z.enum(["studio", "shared-design", "ar"]).default("studio"),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone is required.",
    path: ["phone"],
  });

/**
 * Lead routes.
 *
 * Current purpose:
 * - create quote/inquiry leads
 * - list recent leads for demo/admin use
 *
 * Future:
 * - admin dashboard
 * - email notifications
 * - CRM integration
 */
export const leadsRouter = Router();

/**
 * Creates a lead/inquiry.
 *
 * Endpoint:
 * POST /api/leads
 */
leadsRouter.post("/", async (request, response) => {
  try {
    const parsed = createLeadSchema.parse(request.body);

    const lead = await prisma.lead.create({
      data: {
        customerName: parsed.customerName,
        email: parsed.email ?? null,
        phone: parsed.phone ?? null,
        city: parsed.city ?? null,
        message: parsed.message ?? null,
        designId: parsed.designId ?? null,
        config: parsed.config as unknown as Prisma.InputJsonValue,
        source: parsed.source,
      },
    });

    response.status(201).json({
      data: {
        id: lead.id,
        customerName: lead.customerName,
        email: lead.email,
        phone: lead.phone,
        city: lead.city,
        message: lead.message,
        designId: lead.designId,
        config: parsed.config,
        source: lead.source,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      },
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
          code: "CREATE_LEAD_VALIDATION_FAILED",
          message: "Lead information is invalid.",
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
        code: "CREATE_LEAD_FAILED",
        message: "Could not create lead.",
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * Lists recent leads.
 *
 * Endpoint:
 * GET /api/leads
 */
leadsRouter.get("/", async (_request, response) => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
      select: {
        id: true,
        customerName: true,
        email: true,
        phone: true,
        city: true,
        message: true,
        designId: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    response.json({
      data: leads.map((lead) => ({
        ...lead,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
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
        code: "LIST_LEADS_FAILED",
        message: "Could not list leads.",
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arRouter = void 0;
const node_crypto_1 = require("node:crypto");
const express_1 = require("express");
const zod_1 = require("zod");
const env_1 = require("../config/env");
const designConfig_1 = require("../schemas/designConfig");
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
exports.arRouter = (0, express_1.Router)();
exports.arRouter.post("/iphone-preview", (request, response) => {
    try {
        const config = designConfig_1.designConfigSchema.parse(request.body);
        const iphonePreview = buildIphonePreview(config);
        response.json({
            data: iphonePreview,
            error: null,
            meta: {
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
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
function buildIphonePreview(config) {
    const previewId = (0, node_crypto_1.randomUUID)();
    /**
     * This file should exist in:
     * apps/web/public/ar/demo-pool.usdz
     *
     * Browser URL:
     * http://localhost:3000/ar/demo-pool.usdz
     */
    const staticUsdzUrl = `${env_1.env.FRONTEND_PUBLIC_URL}/ar/demo-pool.usdz`;
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
            currentStep: "API contract is ready. Next step is server-side USDZ generation.",
            futureOutputPath: `/generated/usdz/${previewId}.usdz`,
        },
        notes: [
            "This endpoint validates the current live pool design.",
            "The current USDZ URL is static for POC testing.",
            "Dynamic USDZ generation will replace this static URL later.",
        ],
    };
}

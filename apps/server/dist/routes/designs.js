"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.designsRouter = void 0;
const node_crypto_1 = require("node:crypto");
const express_1 = require("express");
const zod_1 = require("zod");
const designConfig_1 = require("../schemas/designConfig");
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
exports.designsRouter = (0, express_1.Router)();
exports.designsRouter.post("/preview", (request, response) => {
    try {
        const config = designConfig_1.designConfigSchema.parse(request.body);
        const preview = buildDesignPreview(config);
        response.json({
            data: preview,
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
function buildDesignPreview(config) {
    const { length, width, depth } = config.dimensions;
    const waterSurfaceArea = length * width;
    const approximateWaterVolume = length * width * depth;
    const deckFootprintArea = (length + 3.8) * (width + 3.8);
    return {
        previewId: (0, node_crypto_1.randomUUID)(),
        config,
        summary: {
            title: "Rectangular Pool Preview",
            dimensionsLabel: `${length.toFixed(1)}m × ${width.toFixed(1)}m × ${depth.toFixed(1)}m`,
            waterSurfaceAreaSqm: roundNumber(waterSurfaceArea),
            approximateWaterVolumeCbm: roundNumber(approximateWaterVolume),
            deckFootprintAreaSqm: roundNumber(deckFootprintArea),
        },
        ar: {
            androidWebXR: "ready",
            iPhoneQuickLook: "pending-usdz-converter",
            nextStep: "Use this validated design config to generate a clean USDZ file for iPhone AR.",
        },
    };
}
function roundNumber(value) {
    return Math.round(value * 100) / 100;
}

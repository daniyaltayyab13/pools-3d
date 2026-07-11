"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const health_1 = require("./routes/health");
const designs_1 = require("./routes/designs");
const ar_1 = require("./routes/ar");
const paths_1 = require("./config/paths");
/**
 * Express app configuration.
 *
 * This file contains:
 * - middleware
 * - CORS setup
 * - routes
 * - fallback handlers
 *
 * It does NOT start the server.
 * Server startup lives in server.ts.
 */
function createApp() {
    const app = (0, express_1.default)();
    /**
     * Trust Railway/Vercel proxy headers.
     *
     * This helps Express understand the original protocol/host
     * when building public URLs later.
    */
    app.set("trust proxy", 1);
    /**
     * Security headers.
     */
    app.use((0, helmet_1.default)());
    /**
     * CORS configuration.
     *
     * Local frontend:
     * http://localhost:3000
     *
     * Production frontend:
     * https://pools-3d.vercel.app
     */
    app.use((0, cors_1.default)({
        origin(origin, callback) {
            /**
             * Allow tools like curl/Postman where origin is undefined.
             */
            if (!origin) {
                callback(null, true);
                return;
            }
            if (env_1.allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error(`CORS blocked origin: ${origin}`));
        },
    }));
    /**
     * JSON body parser.
     *
     * 10mb is enough for normal API payloads.
     * Later, if we upload GLB files for USDZ conversion, we may use multipart upload.
     */
    app.use(express_1.default.json({ limit: "10mb" }));
    /**
     * Request logging.
    */
    app.use((0, morgan_1.default)(env_1.env.NODE_ENV === "production" ? "combined" : "dev"));
    /**
     * Generated USDZ asset hosting.
     *
     * Files written to:
     * apps/server/storage/generated/usdz
     *
     * Public route:
     * /generated/usdz/<previewId>.usdz
    */
    app.use("/generated/usdz", express_1.default.static(paths_1.generatedUsdzDir, {
        setHeaders(response, filePath) {
            if (filePath.endsWith(".usdz")) {
                response.setHeader("Content-Type", "model/vnd.usdz+zip");
                response.setHeader("Cache-Control", "public, max-age=3600");
            }
        },
    }));
    /**
     * Basic health routes.
     */
    app.use(health_1.healthRouter);
    /**
     * Design API routes.
     *
     * Base path:
     * /api/designs
     *
     * Current endpoint:
     * POST /api/designs/preview
     *
     * Purpose:
     * - receive current pool design from frontend
     * - validate design config
     * - return calculated preview summary
     *
     * Future:
     * - save designs
     * - generate share links
     * - trigger iPhone USDZ conversion
     */
    app.use("/api/designs", designs_1.designsRouter);
    /**
     * AR API routes.
     *
     * Base path:
     * /api/ar
     *
     * Current endpoint:
     * POST /api/ar/iphone-preview
     *
     * Purpose:
     * - receive current pool design from frontend
     * - validate design config
     * - return iPhone Quick Look USDZ preview info
     *
     * Future:
     * - generate USDZ dynamically
     * - cache USDZ files
     * - return generated iPhone AR URL
    */
    app.use("/api/ar", ar_1.arRouter);
    /**
     * API namespace health check.
     *
     * Frontend can call this route to verify backend connection.
     */
    app.get("/api/health", (_request, response) => {
        response.json({
            data: {
                ok: true,
                service: "pools-3d-server",
            },
            error: null,
            meta: {
                timestamp: new Date().toISOString(),
            },
        });
    });
    /**
     * 404 fallback.
     */
    app.use((_request, response) => {
        response.status(404).json({
            data: null,
            error: {
                code: "NOT_FOUND",
                message: "Route not found.",
            },
            meta: {
                timestamp: new Date().toISOString(),
            },
        });
    });
    return app;
}

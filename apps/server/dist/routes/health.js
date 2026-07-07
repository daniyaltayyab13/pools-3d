"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
/**
 * Health route.
 *
 * Used by:
 * - local testing
 * - Railway/Render health checks later
 * - frontend connection test
 */
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get("/health", (_request, response) => {
    response.json({
        ok: true,
        service: "pools-3d-server",
        timestamp: new Date().toISOString(),
    });
});

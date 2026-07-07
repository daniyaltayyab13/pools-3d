import { Router } from "express";

/**
 * Health route.
 *
 * Used by:
 * - local testing
 * - Railway/Render health checks later
 * - frontend connection test
 */
export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "pools-3d-server",
    timestamp: new Date().toISOString(),
  });
});

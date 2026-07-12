import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { allowedOrigins, env } from "./config/env";

import { healthRouter } from "./routes/health";
import { designsRouter } from "./routes/designs";
import { arRouter } from "./routes/ar";
import { leadsRouter } from "./routes/leads";

import { generatedUsdzDir } from "./config/paths";

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
export function createApp() {
  const app = express();

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
  app.use(helmet());

  /**
   * CORS configuration.
   *
   * Local frontend:
   * http://localhost:3000
   *
   * Production frontend:
   * https://pools-3d.vercel.app
   */
  app.use(
    cors({
      origin(origin, callback) {
        /**
         * Allow tools like curl/Postman where origin is undefined.
         */
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS blocked origin: ${origin}`));
      },
    })
  );

  /**
   * JSON body parser.
   *
   * 10mb is enough for normal API payloads.
   * Later, if we upload GLB files for USDZ conversion, we may use multipart upload.
   */
  app.use(express.json({ limit: "10mb" }));

  /**
   * Request logging.
  */
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  /**
   * Generated USDZ asset hosting.
   *
   * Files written to:
   * apps/server/storage/generated/usdz
   *
   * Public route:
   * /generated/usdz/<previewId>.usdz
  */
  app.use(
    "/generated/usdz",
    express.static(generatedUsdzDir, {
      setHeaders(response, filePath) {
        if (filePath.endsWith(".usdz")) {
          response.setHeader("Content-Type", "model/vnd.usdz+zip");
          response.setHeader("Cache-Control", "public, max-age=3600");
        }
      },
    })
  );

  /**
   * Basic health routes.
   */
  app.use(healthRouter);

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
  app.use("/api/designs", designsRouter);

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
  app.use("/api/ar", arRouter);

  /**
   * Lead / inquiry API routes.
   *
   * Base path:
   * /api/leads
   *
   * Current endpoints:
   * POST /api/leads
   * GET /api/leads
   *
   * Purpose:
   * - capture customer quote requests
   * - attach current pool design config
   *
   * Future:
   * - admin dashboard
   * - email notifications
   * - CRM integration
   */
  app.use("/api/leads", leadsRouter);

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

import path from "node:path";

/**
 * Server runtime paths.
 *
 * Railway runs the server from apps/server as the working directory
 * because our Railway root directory is apps/server.
 */
export const serverRootPath = process.cwd();

/**
 * Static template USDZ used for the current POC fallback.
 *
 * Later, this template will be replaced by a real dynamic USDZ generator.
 */
export const templateUsdzPath = path.join(
  serverRootPath,
  "assets",
  "templates",
  "demo-pool.usdz"
);

/**
 * Runtime folder where generated USDZ files are written.
 *
 * Example public URL:
 * /generated/usdz/<previewId>.usdz
 */
export const generatedUsdzDir = path.join(
  serverRootPath,
  "storage",
  "generated",
  "usdz"
);

/**
 * Runtime folder where metadata for generated previews is written.
 *
 * This is useful for debugging and future persistence.
 */
export const generatedMetadataDir = path.join(
  serverRootPath,
  "storage",
  "generated",
  "metadata"
);

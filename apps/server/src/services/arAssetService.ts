import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  generatedMetadataDir,
  generatedUsdzDir,
  templateUsdzPath,
} from "../config/paths";
import type { DesignConfig } from "../schemas/designConfig";
import { generateProceduralPoolUsdz } from "./proceduralPoolUsdzService";

type CreateStaticIphoneArAssetParams = {
  previewId: string;
  config: DesignConfig;
};

/**
 * Result returned after creating an iPhone AR preview asset.
 */
export type GeneratedIphoneArAsset = {
  fileName: string;
  relativeUrl: string;
  absoluteFilePath: string;
  metadataFilePath: string;
};

/**
 * Creates a server-hosted USDZ preview file.
 *
 * Current behavior:
 * - copies a static demo USDZ template
 * - saves metadata for the requested design config
 *
 * Future behavior:
 * - generate GLB from the design config
 * - convert GLB to USDZ
 * - save the generated USDZ file
 */
export async function createStaticIphoneArAsset({
  previewId,
  config,
}: CreateStaticIphoneArAssetParams): Promise<GeneratedIphoneArAsset> {
  await mkdir(generatedUsdzDir, { recursive: true });
  await mkdir(generatedMetadataDir, { recursive: true });

  const fileName = `${previewId}.usdz`;
  const absoluteFilePath = path.join(generatedUsdzDir, fileName);
  const metadataFilePath = path.join(generatedMetadataDir, `${previewId}.json`);

  /**
   * For Step 16, this is still a static template copy.
   * The important change is that the backend now owns the generated AR asset URL.
   */
  await copyFile(templateUsdzPath, absoluteFilePath);

  await writeFile(
    metadataFilePath,
    JSON.stringify(
      {
        previewId,
        mode: "server-static-usdz-fallback",
        config,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    fileName,
    relativeUrl: `/generated/usdz/${fileName}`,
    absoluteFilePath,
    metadataFilePath,
  };
}

/**
 * Creates a design-specific dynamic USDZ preview file.
 *
 * V1 behavior:
 * - generates a procedural pool model from dimensions/materials
 * - exports that model to USDZ
 * - stores metadata for debugging
 */
export async function createDynamicIphoneArAsset({
  previewId,
  config,
}: CreateStaticIphoneArAssetParams): Promise<GeneratedIphoneArAsset> {
  await mkdir(generatedUsdzDir, { recursive: true });
  await mkdir(generatedMetadataDir, { recursive: true });

  const fileName = `${previewId}.usdz`;
  const absoluteFilePath = path.join(generatedUsdzDir, fileName);
  const metadataFilePath = path.join(generatedMetadataDir, `${previewId}.json`);

  const usdzBuffer = await generateProceduralPoolUsdz(config);

  await writeFile(absoluteFilePath, usdzBuffer);

  await writeFile(
    metadataFilePath,
    JSON.stringify(
      {
        previewId,
        mode: "dynamic-usdz-v1",
        config,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    fileName,
    relativeUrl: `/generated/usdz/${fileName}`,
    absoluteFilePath,
    metadataFilePath,
  };
}

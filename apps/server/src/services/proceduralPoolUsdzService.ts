import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Material,
} from "three";
import { Buffer } from "node:buffer";
import type { DesignConfig } from "../schemas/designConfig";

/**
 * Minimal runtime type for Three.js USDZExporter.
 *
 * We use dynamic ESM import because our backend is currently CommonJS,
 * while Three.js examples/exporters are ESM modules.
 */
type UsdzExporterResult = ArrayBuffer | Uint8Array | Buffer | Blob | string;

type UsdzExporterOptions = {
  maxTextureSize?: number;
  includeAnchoringProperties?: boolean;
  quickLookCompatible?: boolean;
  ar?: {
    anchoring?: {
      type?: "plane";
    };
    planeAnchoring?: {
      alignment?: "horizontal" | "vertical";
    };
  };
};

type UsdzExporterInstance = {
  parse: (
    input: Group,
    onDone?: (result: UsdzExporterResult) => void,
    onError?: (error: unknown) => void,
    options?: UsdzExporterOptions
  ) => Promise<UsdzExporterResult> | UsdzExporterResult | void;

  parseAsync?: (
    input: Group,
    options?: UsdzExporterOptions
  ) => Promise<ArrayBuffer>;
};

type UsdzExporterModule = {
  USDZExporter: new () => UsdzExporterInstance;
};

const importEsm = new Function("specifier", "return import(specifier)") as <
  TModule
>(
  specifier: string
) => Promise<TModule>;

/**
 * Generates a simple design-specific USDZ file.
 *
 * Current V1:
 * - procedural rectangular pool
 * - dimensions from current design config
 * - approximate colors from selected materials
 * - no external textures yet
 *
 * Future:
 * - real textures
 * - better pool shell geometry
 * - steps, coping, water improved
 * - conversion pipeline with proper asset optimization
 */
export async function generateProceduralPoolUsdz(
  config: DesignConfig
): Promise<Buffer> {
  const poolModel = buildPoolModel(config);

  const { USDZExporter } = await importEsm<UsdzExporterModule>(
    "three/examples/jsm/exporters/USDZExporter.js"
  );

  const exporter = new USDZExporter();

  const options: UsdzExporterOptions = {
    maxTextureSize: 1024,
    includeAnchoringProperties: true,
    quickLookCompatible: true,
    ar: {
      anchoring: {
        type: "plane",
      },
      planeAnchoring: {
        alignment: "horizontal",
      },
    },
  };

  /**
   * Prefer parseAsync when available because Three.js documents it as
   * the Promise-based USDZ export API.
   */
  if (exporter.parseAsync) {
    const result = await exporter.parseAsync(poolModel, options);
    return Buffer.from(result);
  }

  const result = await parseUsdz(exporter, poolModel, options);

  return usdzResultToBuffer(result);
}

function parseUsdz(
  exporter: UsdzExporterInstance,
  poolModel: Group,
  options: UsdzExporterOptions
): Promise<UsdzExporterResult> {
  return new Promise((resolve, reject) => {
    try {
      const maybeResult = exporter.parse(
        poolModel,
        (result) => {
          resolve(result);
        },
        (error) => {
          reject(toError(error));
        },
        options
      );

      if (isPromiseLike(maybeResult)) {
        maybeResult.then(resolve).catch((error: unknown) => {
          reject(toError(error));
        });
        return;
      }

      if (maybeResult) {
        resolve(maybeResult);
      }
    } catch (error) {
      reject(toError(error));
    }
  });
}

async function usdzResultToBuffer(result: UsdzExporterResult): Promise<Buffer> {
  if (Buffer.isBuffer(result)) {
    return result;
  }

  if (result instanceof ArrayBuffer) {
    return Buffer.from(result);
  }

  if (ArrayBuffer.isView(result)) {
    return Buffer.from(result.buffer);
  }

  if (typeof result === "string") {
    return Buffer.from(result);
  }

  if (result instanceof Blob) {
    return Buffer.from(await result.arrayBuffer());
  }

  throw new Error("USDZ exporter returned an unsupported result type.");
}

function isPromiseLike(
  value: unknown
): value is Promise<UsdzExporterResult> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then: unknown }).then === "function"
  );
}

function toError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

function buildPoolModel(config: DesignConfig) {
  const { length, width, depth } = config.dimensions;

  /**
   * iPhone Quick Look strategy:
   *
   * Do not model the pool as a negative hole in the ground.
   * Quick Look/AR works more reliably when the model is a clean,
   * positive-height, tabletop-style asset.
   *
   * This composition is intentionally closer to the Android AR preview:
   * - deck platform
   * - visible pool shell
   * - grey coping frame
   * - blue water surface
   * - visible steps
   */
  const group = new Group();
  group.name = "Pools3D_iPhone_AR_Pool_V3";

  const deckMargin = 1.7;
  const outerLength = length + deckMargin * 2;
  const outerWidth = width + deckMargin * 2;

  const deckThickness = 0.12;
  const shellHeight = Math.min(Math.max(depth * 0.18, 0.22), 0.34);
  const wallThickness = 0.18;
  const copingWidth = 0.32;
  const copingHeight = 0.12;

  const deckTopY = deckThickness;
  const shellCenterY = deckTopY + shellHeight / 2;
  const copingCenterY = deckTopY + shellHeight + copingHeight / 2;
  const waterY = deckTopY + shellHeight + 0.015;

  const deckMaterial = createMaterial("Deck Greige", "#b8a78f", 0.78);
  const deckEdgeMaterial = createMaterial("Deck Edge", "#7a705f", 0.86);

  const tileMaterial = createMaterial(
    "Pool Tile",
    config.materials.poolTile === "deepNavy" ? "#0f3a5f" : "#16b8d8",
    0.38
  );

  const tileSideMaterial = createMaterial(
    "Pool Tile Side",
    config.materials.poolTile === "deepNavy" ? "#08283f" : "#0a92b4",
    0.52
  );

  const stepMaterial = createMaterial(
    "Pool Steps",
    config.materials.poolTile === "deepNavy" ? "#246f9f" : "#7ce4f5",
    0.35
  );

  const copingMaterial = createMaterial("Silver Grey Coping", "#cbd5e1", 0.48);

  const waterMaterial = createMaterial(
    "Water",
    getWaterColor(config.materials.water),
    0.08
  );

  const waterHighlightMaterial = createMaterial("Water Shine", "#ecfeff", 0.18);

  /**
   * Main deck platform.
   * This avoids the broken/cross-like look from separate deck slabs.
   */
  group.add(
    createBox({
      name: "Deck Platform",
      size: [outerLength, deckThickness, outerWidth],
      position: [0, deckThickness / 2, 0],
      material: deckMaterial,
    })
  );

  /**
   * Deck side edges so the platform has visible thickness.
   */
  addDeckEdges({
    group,
    outerLength,
    outerWidth,
    deckThickness,
    deckEdgeMaterial,
  });

  /**
   * Pool shell walls placed on top of the deck.
   * This is not a real excavation; it is a clear AR presentation model.
   */
  addRaisedPoolShell({
    group,
    length,
    width,
    shellHeight,
    wallThickness,
    shellCenterY,
    tileMaterial,
    tileSideMaterial,
  });

  /**
   * Coping frame on top of the shell.
   */
  addCopingFrame({
    group,
    length,
    width,
    copingWidth,
    copingHeight,
    copingCenterY,
    copingMaterial,
  });

  /**
   * Water surface.
   */
  group.add(
    createBox({
      name: "Water Surface",
      size: [length - copingWidth * 1.6, 0.035, width - copingWidth * 1.6],
      position: [0, waterY, 0],
      material: waterMaterial,
    })
  );

  /**
   * Water highlights.
   */
  group.add(
    createBox({
      name: "Water Shine Long",
      size: [length * 0.58, 0.012, 0.035],
      position: [-length * 0.05, waterY + 0.024, -width * 0.18],
      material: waterHighlightMaterial,
    })
  );

  group.add(
    createBox({
      name: "Water Shine Short",
      size: [length * 0.34, 0.012, 0.03],
      position: [length * 0.12, waterY + 0.027, width * 0.18],
      material: waterHighlightMaterial,
    })
  );

  /**
   * Entry steps.
   */
  addPresentationSteps({
    group,
    length,
    width,
    shellHeight,
    deckTopY,
    waterY,
    stepMaterial,
  });

  /**
   * Small blue tile accent line like Android preview.
   */
  addAccentLines({
    group,
    length,
    width,
    deckTopY,
    tileMaterial,
  });

  /**
   * Center model on origin.
   */
  group.position.set(0, 0, 0);

  return group;
}

function addDeckEdges({
  group,
  outerLength,
  outerWidth,
  deckThickness,
  deckEdgeMaterial,
}: {
  group: Group;
  outerLength: number;
  outerWidth: number;
  deckThickness: number;
  deckEdgeMaterial: Material;
}) {
  const edgeThickness = 0.08;
  const y = deckThickness / 2;

  group.add(
    createBox({
      name: "Deck Edge North",
      size: [outerLength, deckThickness, edgeThickness],
      position: [0, y, outerWidth / 2],
      material: deckEdgeMaterial,
    })
  );

  group.add(
    createBox({
      name: "Deck Edge South",
      size: [outerLength, deckThickness, edgeThickness],
      position: [0, y, -outerWidth / 2],
      material: deckEdgeMaterial,
    })
  );

  group.add(
    createBox({
      name: "Deck Edge East",
      size: [edgeThickness, deckThickness, outerWidth],
      position: [outerLength / 2, y, 0],
      material: deckEdgeMaterial,
    })
  );

  group.add(
    createBox({
      name: "Deck Edge West",
      size: [edgeThickness, deckThickness, outerWidth],
      position: [-outerLength / 2, y, 0],
      material: deckEdgeMaterial,
    })
  );
}

function addRaisedPoolShell({
  group,
  length,
  width,
  shellHeight,
  wallThickness,
  shellCenterY,
  tileMaterial,
  tileSideMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  shellHeight: number;
  wallThickness: number;
  shellCenterY: number;
  tileMaterial: Material;
  tileSideMaterial: Material;
}) {
  group.add(
    createBox({
      name: "Pool Wall North",
      size: [length, shellHeight, wallThickness],
      position: [0, shellCenterY, width / 2],
      material: tileSideMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall South",
      size: [length, shellHeight, wallThickness],
      position: [0, shellCenterY, -width / 2],
      material: tileSideMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall East",
      size: [wallThickness, shellHeight, width],
      position: [length / 2, shellCenterY, 0],
      material: tileSideMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall West",
      size: [wallThickness, shellHeight, width],
      position: [-length / 2, shellCenterY, 0],
      material: tileSideMaterial,
    })
  );

  /**
   * Thin visible inner tile band.
   */
  group.add(
    createBox({
      name: "Inner Tile Band North",
      size: [length - 0.45, 0.055, 0.08],
      position: [0, shellCenterY + shellHeight / 2 + 0.012, width / 2 - 0.24],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Inner Tile Band South",
      size: [length - 0.45, 0.055, 0.08],
      position: [0, shellCenterY + shellHeight / 2 + 0.012, -width / 2 + 0.24],
      material: tileMaterial,
    })
  );
}

function addCopingFrame({
  group,
  length,
  width,
  copingWidth,
  copingHeight,
  copingCenterY,
  copingMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  copingWidth: number;
  copingHeight: number;
  copingCenterY: number;
  copingMaterial: Material;
}) {
  group.add(
    createBox({
      name: "Coping North",
      size: [length + copingWidth * 2, copingHeight, copingWidth],
      position: [0, copingCenterY, width / 2 + copingWidth / 2],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping South",
      size: [length + copingWidth * 2, copingHeight, copingWidth],
      position: [0, copingCenterY, -width / 2 - copingWidth / 2],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping East",
      size: [copingWidth, copingHeight, width + copingWidth * 2],
      position: [length / 2 + copingWidth / 2, copingCenterY, 0],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping West",
      size: [copingWidth, copingHeight, width + copingWidth * 2],
      position: [-length / 2 - copingWidth / 2, copingCenterY, 0],
      material: copingMaterial,
    })
  );
}

function addPresentationSteps({
  group,
  length,
  width,
  shellHeight,
  deckTopY,
  waterY,
  stepMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  shellHeight: number;
  deckTopY: number;
  waterY: number;
  stepMaterial: Material;
}) {
  const stepWidth = Math.min(width - 0.9, 2.2);
  const stepX = -length / 2 + 0.8;
  const stepHeight = 0.055;

  const steps: Array<{
    name: string;
    size: [number, number, number];
    position: [number, number, number];
  }> = [
    {
      name: "Entry Step Top",
      size: [0.7, stepHeight, stepWidth],
      position: [stepX, waterY + 0.03, 0],
    },
    {
      name: "Entry Step Middle",
      size: [1.05, stepHeight, stepWidth],
      position: [stepX + 0.24, deckTopY + shellHeight * 0.58, 0],
    },
    {
      name: "Entry Step Lower",
      size: [1.4, stepHeight, stepWidth],
      position: [stepX + 0.48, deckTopY + shellHeight * 0.38, 0],
    },
  ];

  for (const step of steps) {
    group.add(
      createBox({
        name: step.name,
        size: step.size,
        position: step.position,
        material: stepMaterial,
      })
    );
  }
}

function addAccentLines({
  group,
  length,
  width,
  deckTopY,
  tileMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  deckTopY: number;
  tileMaterial: Material;
}) {
  const y = deckTopY + 0.01;

  group.add(
    createBox({
      name: "Accent Line Front",
      size: [length + 0.6, 0.022, 0.055],
      position: [0, y, -width / 2 - 0.52],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Accent Line Back",
      size: [length + 0.6, 0.022, 0.055],
      position: [0, y, width / 2 + 0.52],
      material: tileMaterial,
    })
  );
}

function createMaterial(name: string, color: string, roughness: number) {
  const material = new MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
  });

  material.name = name;

  return material;
}

function createBox({
  name,
  size,
  position,
  material,
}: {
  name: string;
  size: [number, number, number];
  position: [number, number, number];
  material: Material;
}) {
  const mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), material);

  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);

  return mesh;
}

function getWaterColor(water: DesignConfig["materials"]["water"]) {
  switch (water) {
    case "azure":
      return "#2f80ed";
    case "midnight":
      return "#12315f";
    case "emerald":
      return "#10b981";
    case "caribbean":
    default:
      return "#22d3ee";
  }
}

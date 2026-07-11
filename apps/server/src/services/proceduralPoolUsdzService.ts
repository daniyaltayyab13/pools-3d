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

type UsdzExporterInstance = {
  parse: (
    input: Group,
    onDone?: (result: UsdzExporterResult) => void,
    onError?: (error: unknown) => void
  ) => Promise<UsdzExporterResult> | UsdzExporterResult | void;
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

  /**
   * USDZExporter can behave differently depending on Three.js version:
   * - some versions return a Promise/ArrayBuffer
   * - some versions use callback style and return void
   *
   * This wrapper supports both.
   */
  const result = await parseUsdz(exporter, poolModel);

  return usdzResultToBuffer(result);
}

function parseUsdz(
  exporter: UsdzExporterInstance,
  poolModel: Group
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
        }
      );

      /**
       * Promise-style exporter.
       */
      if (isPromiseLike(maybeResult)) {
        maybeResult.then(resolve).catch((error: unknown) => {
          reject(toError(error));
        });
        return;
      }

      /**
       * Direct return-style exporter.
       */
      if (maybeResult) {
        resolve(maybeResult);
      }

      /**
       * If maybeResult is undefined, callback-style exporter will resolve later.
       */
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
   * USDZ/Quick Look visual strategy:
   *
   * We keep real length/width in meters, but build the deck as four slabs
   * around a center opening. This makes the pool readable in iPhone Quick Look.
   */
  const group = new Group();
  group.name = "Pools3D_Dynamic_Pool_Visual_V2";

  const deckMargin = 1.9;
  const deckThickness = 0.12;
  const wallThickness = 0.14;
  const copingThickness = 0.16;
  const copingWidth = 0.32;

  const outerLength = length + deckMargin * 2;
  const outerWidth = width + deckMargin * 2;

  const deckMaterial = createMaterial("Deck Greige", "#b8a78f", 0.78);
  const deckSideMaterial = createMaterial("Deck Edge Shadow", "#6b6255", 0.85);

  const tileMaterial = createMaterial(
    "Pool Tile",
    config.materials.poolTile === "deepNavy" ? "#0f3a5f" : "#1fb9df",
    0.42
  );

  const tileLightMaterial = createMaterial(
    "Pool Step Tile",
    config.materials.poolTile === "deepNavy" ? "#1d5f8f" : "#53d5ee",
    0.38
  );

  const copingMaterial = createMaterial("Silver Grey Coping", "#cbd5e1", 0.55);

  const waterMaterial = createMaterial(
    "Water",
    getWaterColor(config.materials.water),
    0.12
  );

  const waterHighlightMaterial = createMaterial(
    "Water Highlight",
    "#dffbff",
    0.2
  );

  /**
   * Deck with real center opening.
   * This is much better than one full deck slab because the pool is visible.
   */
  addDeckWithOpening({
    group,
    length,
    width,
    outerLength,
    outerWidth,
    deckMargin,
    deckThickness,
    deckMaterial,
    deckSideMaterial,
  });

  /**
   * Pool basin.
   * Top sits around deck level, bottom goes down by configured depth.
   */
  addPoolBasin({
    group,
    length,
    width,
    depth,
    wallThickness,
    tileMaterial,
  });

  /**
   * Coping frame around the pool.
   */
  addCopingFrame({
    group,
    length,
    width,
    copingThickness,
    copingWidth,
    copingMaterial,
  });

  /**
   * Water surface.
   * Kept slightly below coping top and slightly above deck opening
   * so it remains visible in Quick Look.
   */
  group.add(
    createBox({
      name: "Water Surface",
      size: [length - 0.42, 0.035, width - 0.42],
      position: [0, 0.025, 0],
      material: waterMaterial,
    })
  );

  /**
   * Simple water highlights.
   * These make the USDZ look more like water even without WebGL shaders.
   */
  group.add(
    createBox({
      name: "Water Highlight 1",
      size: [length * 0.42, 0.012, 0.035],
      position: [-length * 0.12, 0.055, -width * 0.18],
      material: waterHighlightMaterial,
    })
  );

  group.add(
    createBox({
      name: "Water Highlight 2",
      size: [length * 0.28, 0.012, 0.03],
      position: [length * 0.16, 0.058, width * 0.12],
      material: waterHighlightMaterial,
    })
  );

  group.add(
    createBox({
      name: "Water Highlight 3",
      size: [length * 0.18, 0.012, 0.025],
      position: [length * 0.02, 0.06, width * 0.28],
      material: waterHighlightMaterial,
    })
  );

  /**
   * Visible entry steps.
   * We place them near the left inside edge and slightly above water surface
   * so Quick Look clearly shows them.
   */
  addVisibleSteps({
    group,
    length,
    width,
    tileLightMaterial,
  });

  /**
   * Move the whole model so the deck top reads nicely in Quick Look.
   */
  group.position.set(0, 0, 0);

  return group;
}

function addDeckWithOpening({
  group,
  length,
  width,
  outerLength,
  outerWidth,
  deckMargin,
  deckThickness,
  deckMaterial,
  deckSideMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  outerLength: number;
  outerWidth: number;
  deckMargin: number;
  deckThickness: number;
  deckMaterial: Material;
  deckSideMaterial: Material;
}) {
  const deckY = -deckThickness / 2;

  /**
   * North and south deck slabs.
   */
  group.add(
    createBox({
      name: "Deck North Slab",
      size: [outerLength, deckThickness, deckMargin],
      position: [0, deckY, width / 2 + deckMargin / 2],
      material: deckMaterial,
    })
  );

  group.add(
    createBox({
      name: "Deck South Slab",
      size: [outerLength, deckThickness, deckMargin],
      position: [0, deckY, -width / 2 - deckMargin / 2],
      material: deckMaterial,
    })
  );

  /**
   * East and west deck slabs.
   */
  group.add(
    createBox({
      name: "Deck East Slab",
      size: [deckMargin, deckThickness, width],
      position: [length / 2 + deckMargin / 2, deckY, 0],
      material: deckMaterial,
    })
  );

  group.add(
    createBox({
      name: "Deck West Slab",
      size: [deckMargin, deckThickness, width],
      position: [-length / 2 - deckMargin / 2, deckY, 0],
      material: deckMaterial,
    })
  );

  /**
   * Dark outside edges give the thin deck visible thickness in USDZ.
   */
  group.add(
    createBox({
      name: "Deck Outer Edge North",
      size: [outerLength, deckThickness * 1.1, 0.08],
      position: [0, deckY - 0.01, outerWidth / 2],
      material: deckSideMaterial,
    })
  );

  group.add(
    createBox({
      name: "Deck Outer Edge South",
      size: [outerLength, deckThickness * 1.1, 0.08],
      position: [0, deckY - 0.01, -outerWidth / 2],
      material: deckSideMaterial,
    })
  );

  group.add(
    createBox({
      name: "Deck Outer Edge East",
      size: [0.08, deckThickness * 1.1, outerWidth],
      position: [outerLength / 2, deckY - 0.01, 0],
      material: deckSideMaterial,
    })
  );

  group.add(
    createBox({
      name: "Deck Outer Edge West",
      size: [0.08, deckThickness * 1.1, outerWidth],
      position: [-outerLength / 2, deckY - 0.01, 0],
      material: deckSideMaterial,
    })
  );
}

function addPoolBasin({
  group,
  length,
  width,
  depth,
  wallThickness,
  tileMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  depth: number;
  wallThickness: number;
  tileMaterial: Material;
}) {
  const wallCenterY = -depth / 2;
  const wallTopY = 0;

  /**
   * Pool bottom.
   */
  group.add(
    createBox({
      name: "Pool Bottom",
      size: [length - wallThickness * 2, 0.08, width - wallThickness * 2],
      position: [0, -depth, 0],
      material: tileMaterial,
    })
  );

  /**
   * Inner walls.
   */
  group.add(
    createBox({
      name: "Pool Wall North",
      size: [length, depth, wallThickness],
      position: [0, wallCenterY, width / 2 - wallThickness / 2],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall South",
      size: [length, depth, wallThickness],
      position: [0, wallCenterY, -width / 2 + wallThickness / 2],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall East",
      size: [wallThickness, depth, width],
      position: [length / 2 - wallThickness / 2, wallCenterY, 0],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall West",
      size: [wallThickness, depth, width],
      position: [-length / 2 + wallThickness / 2, wallCenterY, 0],
      material: tileMaterial,
    })
  );

  /**
   * Thin bright inner rim at waterline.
   */
  group.add(
    createBox({
      name: "Inner Tile Rim North",
      size: [length - 0.3, 0.055, 0.08],
      position: [0, wallTopY + 0.03, width / 2 - 0.23],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Inner Tile Rim South",
      size: [length - 0.3, 0.055, 0.08],
      position: [0, wallTopY + 0.03, -width / 2 + 0.23],
      material: tileMaterial,
    })
  );
}

function addCopingFrame({
  group,
  length,
  width,
  copingThickness,
  copingWidth,
  copingMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  copingThickness: number;
  copingWidth: number;
  copingMaterial: Material;
}) {
  const copingY = copingThickness / 2 - 0.005;

  group.add(
    createBox({
      name: "Coping North",
      size: [length + copingWidth * 2, copingThickness, copingWidth],
      position: [0, copingY, width / 2 + copingWidth / 2],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping South",
      size: [length + copingWidth * 2, copingThickness, copingWidth],
      position: [0, copingY, -width / 2 - copingWidth / 2],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping East",
      size: [copingWidth, copingThickness, width + copingWidth * 2],
      position: [length / 2 + copingWidth / 2, copingY, 0],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping West",
      size: [copingWidth, copingThickness, width + copingWidth * 2],
      position: [-length / 2 - copingWidth / 2, copingY, 0],
      material: copingMaterial,
    })
  );
}

function addVisibleSteps({
  group,
  length,
  width,
  tileLightMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  tileLightMaterial: Material;
}) {
  const stepWidth = Math.min(width - 0.7, 2.4);
  const stepThickness = 0.09;
  const startX = -length / 2 + 0.55;

  const steps: Array<{
    name: string;
    size: [number, number, number];
    position: [number, number, number];
  }> = [
    {
      name: "Entry Step Top",
      size: [0.65, stepThickness, stepWidth],
      position: [startX, 0.065, 0],
    },
    {
      name: "Entry Step Middle",
      size: [0.95, stepThickness, stepWidth],
      position: [startX + 0.22, 0.025, 0],
    },
    {
      name: "Entry Step Lower",
      size: [1.25, stepThickness, stepWidth],
      position: [startX + 0.44, -0.015, 0],
    },
  ];

  for (const step of steps) {
    group.add(
      createBox({
        name: step.name,
        size: step.size,
        position: step.position,
        material: tileLightMaterial,
      })
    );
  }
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

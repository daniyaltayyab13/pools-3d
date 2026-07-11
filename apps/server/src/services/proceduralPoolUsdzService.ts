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
  /**
   * iPhone Quick Look strategy:
   *
   * The real pool dimensions are large, for example 8m x 4m.
   * In a small room, iPhone Quick Look places that at real-world scale,
   * so the user only sees a huge slab.
   *
   * For this POC, we create a scaled presentation model:
   * - same proportions
   * - same selected colors
   * - clearly visible water, coping, deck, and steps
   * - no thin cross/highlight lines
   */
  const realLength = config.dimensions.length;
  const realWidth = config.dimensions.width;

  const maxPreviewLength = 2.8;
  const scale = maxPreviewLength / realLength;

  const length = realLength * scale;
  const width = realWidth * scale;

  const group = new Group();
  group.name = "Pools3D_iPhone_AR_Presentation_Pool";

  const deckMargin = 0.45;
  const outerLength = length + deckMargin * 2;
  const outerWidth = width + deckMargin * 2;

  /**
   * Use bigger vertical separation than normal Three.js scene.
   * Quick Look reads very thin layered meshes poorly, especially from AR view.
   */
  const deckThickness = 0.08;
  const poolWallHeight = 0.18;
  const wallThickness = 0.08;
  const copingWidth = 0.12;
  const copingHeight = 0.06;
  const waterThickness = 0.035;

  const deckY = deckThickness / 2;
  const poolWallY = deckThickness + poolWallHeight / 2;
  const copingY = deckThickness + poolWallHeight + copingHeight / 2;
  const waterY = deckThickness + poolWallHeight + waterThickness / 2 + 0.02;

  const deckMaterial = createMaterial("Greige Deck", "#b7a68f", 0.78);

  const deckEdgeMaterial = createMaterial("Deck Edge", "#6f6658", 0.85);

  const tileMaterial = createMaterial(
    "Pool Tile",
    config.materials.poolTile === "deepNavy" ? "#0d3558" : "#10b8d7",
    0.35
  );

  const tileDarkMaterial = createMaterial(
    "Pool Tile Dark Side",
    config.materials.poolTile === "deepNavy" ? "#08283f" : "#087f9f",
    0.5
  );

  const stepMaterial = createMaterial(
    "Pool Steps",
    config.materials.poolTile === "deepNavy" ? "#1e6898" : "#70e0f2",
    0.32
  );

  const copingMaterial = createMaterial("Silver Grey Coping", "#cbd5e1", 0.45);

  const waterMaterial = createMaterial(
    "Pool Water",
    getWaterColor(config.materials.water),
    0.05
  );

  /**
   * Deck base.
   */
  group.add(
    createBox({
      name: "Deck Platform",
      size: [outerLength, deckThickness, outerWidth],
      position: [0, deckY, 0],
      material: deckMaterial,
    })
  );

  /**
   * Deck side edges.
   */
  addSimpleDeckEdges({
    group,
    outerLength,
    outerWidth,
    deckThickness,
    deckEdgeMaterial,
  });

  /**
   * Pool wall / shell.
   * This is raised on top of deck for clear iPhone AR presentation.
   */
  addSimplePoolShell({
    group,
    length,
    width,
    poolWallHeight,
    wallThickness,
    poolWallY,
    tileMaterial,
    tileDarkMaterial,
  });

  /**
   * Main visible water rectangle.
   * This is intentionally thick and above the deck, so iPhone cannot hide it.
   */
  group.add(
    createBox({
      name: "Main Water Surface",
      size: [length - copingWidth * 2.4, waterThickness, width - copingWidth * 2.4],
      position: [0, waterY, 0],
      material: waterMaterial,
    })
  );

  /**
   * Coping frame.
   */
  addSimpleCopingFrame({
    group,
    length,
    width,
    copingWidth,
    copingHeight,
    copingY,
    copingMaterial,
  });

  /**
   * Entry steps.
   */
  addSimpleSteps({
    group,
    length,
    width,
    waterY,
    stepMaterial,
  });

  /**
   * Small raised border around water to make pool outline readable.
   */
  addWaterBorder({
    group,
    length,
    width,
    waterY,
    tileMaterial,
  });

  /**
   * Keep model very close to origin.
   * Quick Look behaves better when model is centered near origin.
   */
  group.position.set(0, 0, 0);

  return group;
}

function addSimpleDeckEdges({
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
  const edgeThickness = 0.04;
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

function addSimplePoolShell({
  group,
  length,
  width,
  poolWallHeight,
  wallThickness,
  poolWallY,
  tileMaterial,
  tileDarkMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  poolWallHeight: number;
  wallThickness: number;
  poolWallY: number;
  tileMaterial: Material;
  tileDarkMaterial: Material;
}) {
  group.add(
    createBox({
      name: "Pool Wall North",
      size: [length, poolWallHeight, wallThickness],
      position: [0, poolWallY, width / 2],
      material: tileDarkMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall South",
      size: [length, poolWallHeight, wallThickness],
      position: [0, poolWallY, -width / 2],
      material: tileDarkMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall East",
      size: [wallThickness, poolWallHeight, width],
      position: [length / 2, poolWallY, 0],
      material: tileDarkMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall West",
      size: [wallThickness, poolWallHeight, width],
      position: [-length / 2, poolWallY, 0],
      material: tileDarkMaterial,
    })
  );

  /**
   * Inner bright tile band.
   */
  group.add(
    createBox({
      name: "Inner Tile Band North",
      size: [length - 0.18, 0.035, 0.035],
      position: [0, poolWallY + poolWallHeight / 2 + 0.012, width / 2 - 0.12],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Inner Tile Band South",
      size: [length - 0.18, 0.035, 0.035],
      position: [0, poolWallY + poolWallHeight / 2 + 0.012, -width / 2 + 0.12],
      material: tileMaterial,
    })
  );
}

function addSimpleCopingFrame({
  group,
  length,
  width,
  copingWidth,
  copingHeight,
  copingY,
  copingMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  copingWidth: number;
  copingHeight: number;
  copingY: number;
  copingMaterial: Material;
}) {
  group.add(
    createBox({
      name: "Coping North",
      size: [length + copingWidth * 2, copingHeight, copingWidth],
      position: [0, copingY, width / 2 + copingWidth / 2],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping South",
      size: [length + copingWidth * 2, copingHeight, copingWidth],
      position: [0, copingY, -width / 2 - copingWidth / 2],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping East",
      size: [copingWidth, copingHeight, width + copingWidth * 2],
      position: [length / 2 + copingWidth / 2, copingY, 0],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping West",
      size: [copingWidth, copingHeight, width + copingWidth * 2],
      position: [-length / 2 - copingWidth / 2, copingY, 0],
      material: copingMaterial,
    })
  );
}

function addSimpleSteps({
  group,
  length,
  width,
  waterY,
  stepMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  waterY: number;
  stepMaterial: Material;
}) {
  const stepWidth = Math.min(width - 0.28, 0.8);
  const stepHeight = 0.04;
  const startX = -length / 2 + 0.28;

  const steps: Array<{
    name: string;
    size: [number, number, number];
    position: [number, number, number];
  }> = [
    {
      name: "Entry Step Top",
      size: [0.26, stepHeight, stepWidth],
      position: [startX, waterY + 0.035, 0],
    },
    {
      name: "Entry Step Middle",
      size: [0.4, stepHeight, stepWidth],
      position: [startX + 0.1, waterY + 0.005, 0],
    },
    {
      name: "Entry Step Lower",
      size: [0.54, stepHeight, stepWidth],
      position: [startX + 0.2, waterY - 0.025, 0],
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

function addWaterBorder({
  group,
  length,
  width,
  waterY,
  tileMaterial,
}: {
  group: Group;
  length: number;
  width: number;
  waterY: number;
  tileMaterial: Material;
}) {
  const borderHeight = 0.025;
  const borderWidth = 0.035;
  const y = waterY + 0.04;

  group.add(
    createBox({
      name: "Water Border North",
      size: [length - 0.28, borderHeight, borderWidth],
      position: [0, y, width / 2 - 0.18],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Water Border South",
      size: [length - 0.28, borderHeight, borderWidth],
      position: [0, y, -width / 2 + 0.18],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Water Border East",
      size: [borderWidth, borderHeight, width - 0.28],
      position: [length / 2 - 0.18, y, 0],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Water Border West",
      size: [borderWidth, borderHeight, width - 0.28],
      position: [-length / 2 + 0.18, y, 0],
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
      return "#14c8e8";
  }
}

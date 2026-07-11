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

  const group = new Group();
  group.name = "Pools3D_Dynamic_Pool";

  const tileMaterial = createMaterial(
    "Pool Tile",
    config.materials.poolTile === "deepNavy" ? "#0f3a5f" : "#20bfe3",
    0.35
  );

  const copingMaterial = createMaterial("Coping", "#cbd5e1", 0.55);
  const deckMaterial = createMaterial("Deck", "#b8a78f", 0.75);
  const waterMaterial = createMaterial(
    "Water",
    getWaterColor(config.materials.water),
    0.18
  );

  /**
   * Deck slab.
   */
  group.add(
    createBox({
      name: "Deck",
      size: [length + 3.8, 0.12, width + 3.8],
      position: [0, -0.12, 0],
      material: deckMaterial,
    })
  );

  /**
   * Pool bottom.
   */
  group.add(
    createBox({
      name: "Pool Bottom",
      size: [length, 0.08, width],
      position: [0, -depth, 0],
      material: tileMaterial,
    })
  );

  /**
   * Pool side walls.
   */
  group.add(
    createBox({
      name: "Pool Wall North",
      size: [length, depth, 0.12],
      position: [0, -depth / 2, width / 2],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall South",
      size: [length, depth, 0.12],
      position: [0, -depth / 2, -width / 2],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall East",
      size: [0.12, depth, width + 0.24],
      position: [length / 2, -depth / 2, 0],
      material: tileMaterial,
    })
  );

  group.add(
    createBox({
      name: "Pool Wall West",
      size: [0.12, depth, width + 0.24],
      position: [-length / 2, -depth / 2, 0],
      material: tileMaterial,
    })
  );

  /**
   * Coping bars.
   */
  group.add(
    createBox({
      name: "Coping North",
      size: [length + 0.5, 0.16, 0.28],
      position: [0, 0.04, width / 2 + 0.15],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping South",
      size: [length + 0.5, 0.16, 0.28],
      position: [0, 0.04, -width / 2 - 0.15],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping East",
      size: [0.28, 0.16, width + 0.5],
      position: [length / 2 + 0.15, 0.04, 0],
      material: copingMaterial,
    })
  );

  group.add(
    createBox({
      name: "Coping West",
      size: [0.28, 0.16, width + 0.5],
      position: [-length / 2 - 0.15, 0.04, 0],
      material: copingMaterial,
    })
  );

  /**
   * Water surface.
   *
   * We keep this as a thin solid mesh for stronger USDZ compatibility.
   */
  group.add(
    createBox({
      name: "Water Surface",
      size: [length - 0.35, 0.035, width - 0.35],
      position: [0, -0.08, 0],
      material: waterMaterial,
    })
  );

  /**
   * Simple entry steps.
   */
  const stepWidth = Math.min(width - 0.6, 2.2);
  const stepDepth = 0.45;

  for (let index = 0; index < 3; index += 1) {
    group.add(
      createBox({
        name: `Step ${index + 1}`,
        size: [stepDepth, 0.12, stepWidth],
        position: [
          -length / 2 + 0.35 + index * 0.38,
          -0.25 - index * 0.25,
          0,
        ],
        material: tileMaterial,
      })
    );
  }

  return group;
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
      return "#0f172a";
    case "emerald":
      return "#10b981";
    case "caribbean":
    default:
      return "#22d3ee";
  }
}

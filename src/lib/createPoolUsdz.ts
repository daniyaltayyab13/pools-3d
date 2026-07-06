import * as THREE from "three";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import { WATER_PRESETS } from "@/config/materials";
import type { PoolDimensions } from "@/store/usePoolStore";
import type { PoolMaterials } from "@/config/materials";

/**
 * Creates a dynamic USDZ file URL for iPhone AR Quick Look.
 *
 * POC goal:
 * - Generate current pool shape/dimensions as a real 3D AR model.
 * - Keep it lightweight and reliable.
 *
 * Note:
 * This first iPhone AR version uses color-based materials instead of image
 * textures because USDZ texture export can be browser/device sensitive.
 */
export async function createPoolUsdzUrl({
  dimensions,
  materials,
}: {
  dimensions: PoolDimensions;
  materials: PoolMaterials;
}) {
  const group = buildPoolObject3D({ dimensions, materials });

  const exporter = new USDZExporter();

  /**
   * USDZExporter returns an ArrayBuffer.
   * We convert it into a browser object URL that iOS Safari can open.
   */
  const arrayBuffer = await exporter.parseAsync(group);

  const blob = new Blob([arrayBuffer], {
    type: "model/vnd.usdz+zip",
  });

  const url = URL.createObjectURL(blob);

  disposeObject3D(group);

  return url;
}

/**
 * Builds a THREE.Group version of our current pool.
 *
 * This mirrors the visible POC scene:
 * - deck
 * - pool floor
 * - walls
 * - coping
 * - water
 * - entry steps
 *
 * 1 unit = 1 meter.
 */
function buildPoolObject3D({
  dimensions,
  materials,
}: {
  dimensions: PoolDimensions;
  materials: PoolMaterials;
}) {
  const { length, width, depth } = dimensions;

  const group = new THREE.Group();
  group.name = "Pools 3D Studio - iPhone AR Preview";

  const colors = getMaterialColors(materials);

  const deckMaterial = createStandardMaterial(colors.deck, 0.86);
  const copingMaterial = createStandardMaterial(colors.coping, 0.74);
  const poolMaterial = createStandardMaterial(colors.poolTile, 0.38);
  const stepMaterial = createStandardMaterial("#d9fbff", 0.32);

  const waterMaterial = new THREE.MeshStandardMaterial({
    color: colors.water,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.52,
  });

  const deckLength = length + 3.2;
  const deckWidth = width + 3.2;

  /**
   * Deck top should sit close to ground level in AR.
   * Quick Look places the model around its origin, so we keep the deck centered.
   */
  addBox({
    parent: group,
    name: "Stone Deck",
    size: [deckLength, 0.18, deckWidth],
    position: [0, -0.09, 0],
    material: deckMaterial,
  });

  /**
   * Pool floor and walls go below the deck level.
   */
  addBox({
    parent: group,
    name: "Pool Floor",
    size: [length, 0.12, width],
    position: [0, -depth, 0],
    material: poolMaterial,
  });

  const wallThickness = 0.18;

  addBox({
    parent: group,
    name: "Front Pool Wall",
    size: [length, depth, wallThickness],
    position: [0, -depth / 2, width / 2],
    material: poolMaterial,
  });

  addBox({
    parent: group,
    name: "Back Pool Wall",
    size: [length, depth, wallThickness],
    position: [0, -depth / 2, -width / 2],
    material: poolMaterial,
  });

  addBox({
    parent: group,
    name: "Right Pool Wall",
    size: [wallThickness, depth, width],
    position: [length / 2, -depth / 2, 0],
    material: poolMaterial,
  });

  addBox({
    parent: group,
    name: "Left Pool Wall",
    size: [wallThickness, depth, width],
    position: [-length / 2, -depth / 2, 0],
    material: poolMaterial,
  });

  /**
   * Coping / stone edge around pool.
   */
  const copingThickness = 0.34;
  const copingHeight = 0.24;

  addBox({
    parent: group,
    name: "Front Coping",
    size: [length + copingThickness * 2, copingHeight, copingThickness],
    position: [0, copingHeight / 2, width / 2 + copingThickness / 2],
    material: copingMaterial,
  });

  addBox({
    parent: group,
    name: "Back Coping",
    size: [length + copingThickness * 2, copingHeight, copingThickness],
    position: [0, copingHeight / 2, -width / 2 - copingThickness / 2],
    material: copingMaterial,
  });

  addBox({
    parent: group,
    name: "Right Coping",
    size: [copingThickness, copingHeight, width],
    position: [length / 2 + copingThickness / 2, copingHeight / 2, 0],
    material: copingMaterial,
  });

  addBox({
    parent: group,
    name: "Left Coping",
    size: [copingThickness, copingHeight, width],
    position: [-length / 2 - copingThickness / 2, copingHeight / 2, 0],
    material: copingMaterial,
  });

  /**
   * Water as a very thin transparent box.
   * This exports more reliably to USDZ than a pure PlaneGeometry.
   */
  addBox({
    parent: group,
    name: "Water Surface",
    size: [Math.max(length - 0.48, 1), 0.025, Math.max(width - 0.48, 1)],
    position: [0, 0.04, 0],
    material: waterMaterial,
  });

  /**
   * Visible entry steps.
   */
  const stepWidth = Math.max(width - 0.95, 1.5);
  const startX = -length / 2 + 0.65;

  addBox({
    parent: group,
    name: "Top Entry Step",
    size: [0.55, 0.1, stepWidth],
    position: [startX, -depth * 0.12, 0],
    material: stepMaterial,
  });

  addBox({
    parent: group,
    name: "Middle Entry Step",
    size: [0.55, 0.1, stepWidth - 0.35],
    position: [startX + 0.55, -depth * 0.26, 0],
    material: stepMaterial,
  });

  addBox({
    parent: group,
    name: "Bottom Entry Step",
    size: [0.55, 0.1, stepWidth - 0.7],
    position: [startX + 1.1, -depth * 0.4, 0],
    material: stepMaterial,
  });

  /**
   * Small cyan LED-style accent line.
   * Good for demo visual punch.
   */
  const ledMaterial = new THREE.MeshBasicMaterial({
    color: "#67e8f9",
  });

  addBox({
    parent: group,
    name: "Front LED Accent",
    size: [length + 0.8, 0.035, 0.035],
    position: [0, 0.22, width / 2 + 0.52],
    material: ledMaterial,
  });

  addBox({
    parent: group,
    name: "Back LED Accent",
    size: [length + 0.8, 0.035, 0.035],
    position: [0, 0.22, -width / 2 - 0.52],
    material: ledMaterial,
  });

  return group;
}

/**
 * Converts current selected material keys into simple AR-safe colors.
 */
function getMaterialColors(materials: PoolMaterials) {
  const waterPreset =
    WATER_PRESETS.find((preset) => preset.key === materials.water) ??
    WATER_PRESETS[0];

  return {
    poolTile: materials.poolTile === "deepNavy" ? "#102a5c" : "#04a8dd",
    coping: "#d6d1c6",
    deck: "#b8aa93",
    water: waterPreset.color,
  };
}

/**
 * Helper for adding box geometry to the USDZ scene.
 */
function addBox({
  parent,
  name,
  size,
  position,
  material,
}: {
  parent: THREE.Object3D;
  name: string;
  size: [number, number, number];
  position: [number, number, number];
  material: THREE.Material;
}) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);

  parent.add(mesh);

  return mesh;
}

/**
 * Standard material helper.
 */
function createStandardMaterial(color: string, roughness: number) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
  });
}

/**
 * Clean up generated geometries/materials after export.
 */
function disposeObject3D(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.geometry.dispose();

    const material = child.material;

    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
      return;
    }

    material.dispose();
  });
}

import * as THREE from "three";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import { WATER_PRESETS } from "@/config/materials";
import type { PoolDimensions } from "@/store/usePoolStore";
import type { PoolMaterials } from "@/config/materials";

/**
 * Creates a dynamic USDZ file URL for iPhone AR Quick Look.
 *
 * Important POC decision:
 * For iPhone AR, we export a clean "surface preview" model instead of a deep
 * recessed pool. Real AR floors do not cut holes into the user's floor, so a
 * below-ground pool can look broken/weird in Quick Look.
 *
 * This version is designed to look good in iPhone AR:
 * - stone deck slab
 * - clear rectangular water area
 * - coping frame
 * - visible shallow-end steps
 * - LED accent lines
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
  const arrayBuffer = await exporter.parseAsync(group);

  const blob = new Blob([arrayBuffer], {
    type: "model/vnd.usdz+zip",
  });

  const url = URL.createObjectURL(blob);

  disposeObject3D(group);

  return url;
}

/**
 * Builds an iPhone-friendly AR model.
 *
 * 1 Three.js unit = 1 meter.
 *
 * We intentionally keep this mostly top-surface based because Apple Quick Look
 * places objects on top of the real floor/ground. A "deep hole" model does not
 * look convincing unless we also build an occlusion/ground-cut system, which is
 * out of scope for this POC.
 */
function buildPoolObject3D({
  dimensions,
  materials,
}: {
  dimensions: PoolDimensions;
  materials: PoolMaterials;
}) {
  const { length, width } = dimensions;

  const group = new THREE.Group();
  group.name = "Pools 3D Studio - iPhone AR Preview";

  const colors = getMaterialColors(materials);

  const deckMaterial = createStandardMaterial(colors.deck, 0.86);
  const copingMaterial = createStandardMaterial(colors.coping, 0.72);
  const waterMaterial = createStandardMaterial(colors.water, 0.18);
  const darkInsetMaterial = createStandardMaterial("#07111f", 0.5);
  const stepMaterial = createStandardMaterial("#d9fbff", 0.26);

  const ledMaterial = new THREE.MeshBasicMaterial({
    color: "#67e8f9",
  });

  const deckLength = length + 3.2;
  const deckWidth = width + 3.2;

  /**
   * Main patio/deck slab.
   * This is the base object that Apple Quick Look places on the real floor.
   */
  addBox({
    parent: group,
    name: "Stone Deck Slab",
    size: [deckLength, 0.08, deckWidth],
    position: [0, 0.04, 0],
    material: deckMaterial,
  });

  /**
   * Dark inset shadow under the water/coping frame.
   * This makes the pool look like it is recessed without actually going deep
   * below the AR floor.
   */
  addBox({
    parent: group,
    name: "Pool Recess Shadow",
    size: [length + 0.3, 0.035, width + 0.3],
    position: [0, 0.1, 0],
    material: darkInsetMaterial,
  });

  /**
   * Water rectangle.
   * It sits slightly above the deck, so iPhone Quick Look renders it cleanly.
   */
  addBox({
    parent: group,
    name: "Water Surface",
    size: [length, 0.04, width],
    position: [0, 0.145, 0],
    material: waterMaterial,
  });

  /**
   * Subtle darker inner border.
   * This creates visual depth around the pool.
   */
  const innerBorderMaterial = createStandardMaterial("#0b1f3a", 0.48);
  const innerBorderThickness = 0.08;

  addBox({
    parent: group,
    name: "Front Inner Depth Border",
    size: [length, 0.035, innerBorderThickness],
    position: [0, 0.17, width / 2 - innerBorderThickness / 2],
    material: innerBorderMaterial,
  });

  addBox({
    parent: group,
    name: "Back Inner Depth Border",
    size: [length, 0.035, innerBorderThickness],
    position: [0, 0.17, -width / 2 + innerBorderThickness / 2],
    material: innerBorderMaterial,
  });

  addBox({
    parent: group,
    name: "Right Inner Depth Border",
    size: [innerBorderThickness, 0.035, width],
    position: [length / 2 - innerBorderThickness / 2, 0.17, 0],
    material: innerBorderMaterial,
  });

  addBox({
    parent: group,
    name: "Left Inner Depth Border",
    size: [innerBorderThickness, 0.035, width],
    position: [-length / 2 + innerBorderThickness / 2, 0.17, 0],
    material: innerBorderMaterial,
  });

  /**
   * Coping / stone frame around pool.
   */
  const copingThickness = 0.34;
  const copingHeight = 0.08;

  addBox({
    parent: group,
    name: "Front Coping",
    size: [length + copingThickness * 2, copingHeight, copingThickness],
    position: [0, 0.22, width / 2 + copingThickness / 2],
    material: copingMaterial,
  });

  addBox({
    parent: group,
    name: "Back Coping",
    size: [length + copingThickness * 2, copingHeight, copingThickness],
    position: [0, 0.22, -width / 2 - copingThickness / 2],
    material: copingMaterial,
  });

  addBox({
    parent: group,
    name: "Right Coping",
    size: [copingThickness, copingHeight, width],
    position: [length / 2 + copingThickness / 2, 0.22, 0],
    material: copingMaterial,
  });

  addBox({
    parent: group,
    name: "Left Coping",
    size: [copingThickness, copingHeight, width],
    position: [-length / 2 - copingThickness / 2, 0.22, 0],
    material: copingMaterial,
  });

  /**
   * Shallow-end steps.
   * These are intentionally visible in iPhone AR. They are placed on top of
   * the water as a visual cue because transparent underwater geometry can be
   * unreliable in Quick Look.
   */
  const stepWidth = Math.max(width - 1.05, 1.5);
  const startX = -length / 2 + 0.7;

  addBox({
    parent: group,
    name: "Top Entry Step",
    size: [0.5, 0.045, stepWidth],
    position: [startX, 0.255, 0],
    material: stepMaterial,
  });

  addBox({
    parent: group,
    name: "Middle Entry Step",
    size: [0.5, 0.045, stepWidth - 0.35],
    position: [startX + 0.55, 0.265, 0],
    material: stepMaterial,
  });

  addBox({
    parent: group,
    name: "Bottom Entry Step",
    size: [0.5, 0.045, stepWidth - 0.7],
    position: [startX + 1.1, 0.275, 0],
    material: stepMaterial,
  });

  /**
   * Small cyan accent lines on both sides.
   */
  addBox({
    parent: group,
    name: "Front LED Accent",
    size: [length + 0.8, 0.035, 0.035],
    position: [0, 0.29, width / 2 + 0.62],
    material: ledMaterial,
  });

  addBox({
    parent: group,
    name: "Back LED Accent",
    size: [length + 0.8, 0.035, 0.035],
    position: [0, 0.29, -width / 2 - 0.62],
    material: ledMaterial,
  });

  /**
   * Move model so its bottom sits cleanly on Quick Look's placement plane.
   */
  group.position.y = 0;

  return group;
}

/**
 * Converts current selected material keys into AR-safe colors.
 *
 * USDZ dynamic texture export can vary by browser/device, so for this POC we
 * use clean material colors that survive iPhone Quick Look reliably.
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
 * Adds a simple box mesh to the USDZ scene.
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
 * Standard AR-safe material.
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

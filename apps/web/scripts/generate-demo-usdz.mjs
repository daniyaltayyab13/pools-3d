import fs from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";

/**
 * Generates a clean static USDZ model for iPhone AR Quick Look.
 *
 * This is intentionally NOT dynamic for the POC.
 * Dynamic browser-generated USDZ was technically opening on iPhone,
 * but the model looked unreliable in Quick Look.
 *
 * This static version is designed to look clean:
 * - beige deck slab
 * - dark pool recess
 * - clear blue water rectangle
 * - stone coping frame
 * - visible entry steps
 * - cyan accent lines
 */

const outputPath = path.join(process.cwd(), "public", "ar", "demo-pool.usdz");

const scene = new THREE.Group();
scene.name = "Pools 3D Studio - Demo Pool";

const deckMaterial = standardMaterial("#cdbf9f", 0.82);
const recessMaterial = standardMaterial("#07111f", 0.45);
const waterMaterial = standardMaterial("#1fbde8", 0.12);
const copingMaterial = standardMaterial("#e2ded2", 0.68);
const stepMaterial = standardMaterial("#e7fbff", 0.26);

const ledMaterial = new THREE.MeshBasicMaterial({
  color: "#67e8f9",
});

/**
 * Demo dimensions in meters.
 */
const poolLength = 6.2;
const poolWidth = 3.2;
const deckLength = 9.2;
const deckWidth = 6.0;
const copingThickness = 0.38;

/**
 * Main deck slab.
 */
addBox({
  parent: scene,
  name: "Stone Deck Slab",
  size: [deckLength, 0.08, deckWidth],
  position: [0, 0.04, 0],
  material: deckMaterial,
});

/**
 * Dark recess/shadow.
 * This gives the illusion of a pool opening without trying to cut a real hole
 * into the iPhone AR floor.
 */
addBox({
  parent: scene,
  name: "Pool Recess Shadow",
  size: [poolLength + 0.5, 0.05, poolWidth + 0.5],
  position: [0, 0.105, 0],
  material: recessMaterial,
});

/**
 * Water surface.
 * Kept solid/opaque-ish for iPhone reliability.
 */
addBox({
  parent: scene,
  name: "Blue Water",
  size: [poolLength, 0.06, poolWidth],
  position: [0, 0.17, 0],
  material: waterMaterial,
});

/**
 * Stone coping frame.
 */
addBox({
  parent: scene,
  name: "Front Coping",
  size: [poolLength + copingThickness * 2, 0.12, copingThickness],
  position: [0, 0.25, poolWidth / 2 + copingThickness / 2],
  material: copingMaterial,
});

addBox({
  parent: scene,
  name: "Back Coping",
  size: [poolLength + copingThickness * 2, 0.12, copingThickness],
  position: [0, 0.25, -poolWidth / 2 - copingThickness / 2],
  material: copingMaterial,
});

addBox({
  parent: scene,
  name: "Right Coping",
  size: [copingThickness, 0.12, poolWidth],
  position: [poolLength / 2 + copingThickness / 2, 0.25, 0],
  material: copingMaterial,
});

addBox({
  parent: scene,
  name: "Left Coping",
  size: [copingThickness, 0.12, poolWidth],
  position: [-poolLength / 2 - copingThickness / 2, 0.25, 0],
  material: copingMaterial,
});

/**
 * Proper visible entry steps.
 * These are on top for AR demo visibility.
 */
const stepWidth = poolWidth - 0.9;
const startX = -poolLength / 2 + 0.75;

addBox({
  parent: scene,
  name: "Top Entry Step",
  size: [0.55, 0.055, stepWidth],
  position: [startX, 0.34, 0],
  material: stepMaterial,
});

addBox({
  parent: scene,
  name: "Middle Entry Step",
  size: [0.55, 0.055, stepWidth - 0.38],
  position: [startX + 0.58, 0.35, 0],
  material: stepMaterial,
});

addBox({
  parent: scene,
  name: "Bottom Entry Step",
  size: [0.55, 0.055, stepWidth - 0.76],
  position: [startX + 1.16, 0.36, 0],
  material: stepMaterial,
});

/**
 * Cyan accent lines for premium visual.
 */
addBox({
  parent: scene,
  name: "Left LED Accent",
  size: [poolLength + 0.8, 0.035, 0.035],
  position: [0, 0.39, poolWidth / 2 + 0.72],
  material: ledMaterial,
});

addBox({
  parent: scene,
  name: "Right LED Accent",
  size: [poolLength + 0.8, 0.035, 0.035],
  position: [0, 0.39, -poolWidth / 2 - 0.72],
  material: ledMaterial,
});

/**
 * Export USDZ.
 */
const exporter = new USDZExporter();
const arrayBuffer = await exporter.parseAsync(scene);

await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

disposeObject3D(scene);

console.log(`✅ Demo USDZ generated: ${outputPath}`);

function addBox({ parent, name, size, position, material }) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);

  parent.add(mesh);

  return mesh;
}

function standardMaterial(color, roughness) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
  });
}

function disposeObject3D(object) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.geometry.dispose();

    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
      return;
    }

    child.material.dispose();
  });
}

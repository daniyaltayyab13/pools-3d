"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { MATERIAL_LIBRARY, WATER_PRESETS } from "@/config/materials";
import type {
  CopingMaterialKey,
  DeckMaterialKey,
  PoolTileKey,
  WaterColorKey,
} from "@/config/materials"
import { usePoolStore } from "@/store/usePoolStore";

type TexturePaths = {
  baseColor: string;
  normal?: string;
  roughness?: string;
};

/**
 * ProceduralPoolScene builds the pool from live dimensions and live materials.
 *
 * Important:
 * We are still not using a static pool model.
 * We generate visible pool parts from values:
 * - floor
 * - walls
 * - coping
 * - deck
 * - water
 * - steps
 */
export function ProceduralPoolScene() {
  const dimensions = usePoolStore((state) => state.dimensions);
  const materials = usePoolStore((state) => state.materials);

  return (
    <group rotation={[0, -0.35, 0]}>
      <DeckBase
        length={dimensions.length}
        width={dimensions.width}
        deckKey={materials.deck}
      />

      <PoolShell
        length={dimensions.length}
        width={dimensions.width}
        depth={dimensions.depth}
        poolTileKey={materials.poolTile}
        copingKey={materials.coping}
      />

      <AnimatedWater
        length={dimensions.length}
        width={dimensions.width}
        waterKey={materials.water}
      />

      <PoolSteps
       length={dimensions.length}
       width={dimensions.width}
       depth={dimensions.depth}
      />

      <AccentRim length={dimensions.length} width={dimensions.width} />
    </group>
  );
}

/**
 * Loads a PBR texture set and prepares it for repeating.
 *
 * Why clone textures?
 * useTexture caches the original texture. If we mutate repeat/wrap directly,
 * the same texture can accidentally affect another mesh. Cloning keeps each
 * surface independent.
 */
function useConfiguredTextureSet({
  paths,
  repeatX,
  repeatY,
}: {
  paths: TexturePaths;
  repeatX: number;
  repeatY: number;
}) {
  const [baseColor, normal, roughness] = useTexture([
    paths.baseColor,
    paths.normal ?? paths.baseColor,
    paths.roughness ?? paths.baseColor,
  ]);

  return useMemo(() => {
    const configureTexture = (texture: THREE.Texture, isColorMap = false) => {
      const clonedTexture = texture.clone();

      clonedTexture.wrapS = THREE.RepeatWrapping;
      clonedTexture.wrapT = THREE.RepeatWrapping;
      clonedTexture.repeat.set(repeatX, repeatY);
      clonedTexture.needsUpdate = true;

      if (isColorMap) {
        clonedTexture.colorSpace = THREE.SRGBColorSpace;
      }

      return clonedTexture;
    };

    return {
      map: configureTexture(baseColor, true),
      normalMap: paths.normal ? configureTexture(normal) : undefined,
      roughnessMap: paths.roughness ? configureTexture(roughness) : undefined,
    };
  }, [baseColor, normal, roughness, paths.normal, paths.roughness, repeatX, repeatY]);
}

/**
 * Reusable textured material for pool/deck/coping surfaces.
 */
function TexturedMaterial({
  paths,
  repeatX,
  repeatY,
  fallbackColor,
  roughness = 0.7,
  metalness = 0.02,
}: {
  paths: TexturePaths;
  repeatX: number;
  repeatY: number;
  fallbackColor: string;
  roughness?: number;
  metalness?: number;
}) {
  const maps = useConfiguredTextureSet({ paths, repeatX, repeatY });

  return (
    <meshStandardMaterial
      color={fallbackColor}
      map={maps.map}
      normalMap={maps.normalMap}
      roughnessMap={maps.roughnessMap}
      roughness={roughness}
      metalness={metalness}
    />
  );
}

/**
 * Patio/deck base around the pool.
 */
function DeckBase({
  length,
  width,
  deckKey,
}: {
  length: number;
  width: number;
  deckKey: DeckMaterialKey;
}) {
  const deckLength = length + 3.2;
  const deckWidth = width + 3.2;

  const deckMaterial =
    MATERIAL_LIBRARY.deck.find((material) => material.key === deckKey) ??
    MATERIAL_LIBRARY.deck[0];

  return (
    <mesh receiveShadow position={[0, -0.22, 0]}>
      <boxGeometry args={[deckLength, 0.18, deckWidth]} />
      <TexturedMaterial
        paths={deckMaterial.maps}
        repeatX={deckLength / 1.4}
        repeatY={deckWidth / 1.4}
        fallbackColor="#b8aa93"
        roughness={0.9}
      />
    </mesh>
  );
}

/**
 * Main rectangular pool shell.
 */
function PoolShell({
  length,
  width,
  depth,
  poolTileKey,
  copingKey,
}: {
  length: number;
  width: number;
  depth: number;
  poolTileKey: PoolTileKey;
  copingKey: CopingMaterialKey;
}) {
  const wallThickness = 0.18;
  const copingThickness = 0.34;
  const copingHeight = 0.24;

  const poolTile =
    MATERIAL_LIBRARY.pool.find((material) => material.key === poolTileKey) ??
    MATERIAL_LIBRARY.pool[0];

  const coping =
    MATERIAL_LIBRARY.coping.find((material) => material.key === copingKey) ??
    MATERIAL_LIBRARY.coping[0];

  return (
    <group>
      {/* Pool floor */}
      <mesh receiveShadow position={[0, -depth, 0]}>
        <boxGeometry args={[length, 0.12, width]} />
        <TexturedMaterial
          paths={poolTile.maps}
          repeatX={length / 1.2}
          repeatY={width / 1.2}
          fallbackColor="#0ea5e9"
          roughness={0.38}
        />
      </mesh>

      {/* Front long wall */}
      <mesh castShadow receiveShadow position={[0, -depth / 2, width / 2]}>
        <boxGeometry args={[length, depth, wallThickness]} />
        <TexturedMaterial
          paths={poolTile.maps}
          repeatX={length / 1.2}
          repeatY={depth / 0.7}
          fallbackColor="#0284c7"
          roughness={0.42}
        />
      </mesh>

      {/* Back long wall */}
      <mesh castShadow receiveShadow position={[0, -depth / 2, -width / 2]}>
        <boxGeometry args={[length, depth, wallThickness]} />
        <TexturedMaterial
          paths={poolTile.maps}
          repeatX={length / 1.2}
          repeatY={depth / 0.7}
          fallbackColor="#0284c7"
          roughness={0.42}
        />
      </mesh>

      {/* Right short wall */}
      <mesh castShadow receiveShadow position={[length / 2, -depth / 2, 0]}>
        <boxGeometry args={[wallThickness, depth, width]} />
        <TexturedMaterial
          paths={poolTile.maps}
          repeatX={width / 1.2}
          repeatY={depth / 0.7}
          fallbackColor="#0369a1"
          roughness={0.42}
        />
      </mesh>

      {/* Left short wall */}
      <mesh castShadow receiveShadow position={[-length / 2, -depth / 2, 0]}>
        <boxGeometry args={[wallThickness, depth, width]} />
        <TexturedMaterial
          paths={poolTile.maps}
          repeatX={width / 1.2}
          repeatY={depth / 0.7}
          fallbackColor="#0369a1"
          roughness={0.42}
        />
      </mesh>

      {/* Coping stones around pool top */}
      <mesh
        castShadow
        receiveShadow
        position={[0, 0.18, width / 2 + copingThickness / 2]}
      >
        <boxGeometry
          args={[length + copingThickness * 2, copingHeight, copingThickness]}
        />
        <TexturedMaterial
          paths={coping.maps}
          repeatX={length / 1.1}
          repeatY={1}
          fallbackColor="#d6d1c6"
          roughness={0.82}
        />
      </mesh>

      <mesh
        castShadow
        receiveShadow
        position={[0, 0.18, -width / 2 - copingThickness / 2]}
      >
        <boxGeometry
          args={[length + copingThickness * 2, copingHeight, copingThickness]}
        />
        <TexturedMaterial
          paths={coping.maps}
          repeatX={length / 1.1}
          repeatY={1}
          fallbackColor="#d6d1c6"
          roughness={0.82}
        />
      </mesh>

      <mesh
        castShadow
        receiveShadow
        position={[length / 2 + copingThickness / 2, 0.18, 0]}
      >
        <boxGeometry args={[copingThickness, copingHeight, width]} />
        <TexturedMaterial
          paths={coping.maps}
          repeatX={width / 1.1}
          repeatY={1}
          fallbackColor="#c9c2b6"
          roughness={0.82}
        />
      </mesh>

      <mesh
        castShadow
        receiveShadow
        position={[-length / 2 - copingThickness / 2, 0.18, 0]}
      >
        <boxGeometry args={[copingThickness, copingHeight, width]} />
        <TexturedMaterial
          paths={coping.maps}
          repeatX={width / 1.1}
          repeatY={1}
          fallbackColor="#c9c2b6"
          roughness={0.82}
        />
      </mesh>
    </group>
  );
}

/**
 * Animated water surface with uploaded water normal map.
 *
 * Fix:
 * - Water is now more transparent so pool floor and steps are visible.
 * - We no longer mutate texture offset inside useFrame, so ESLint passes.
 * - depthWrite=false prevents the water plane from visually blocking objects below it.
 */
function AnimatedWater({
  length,
  width,
  waterKey,
}: {
  length: number;
  width: number;
  waterKey: WaterColorKey;
}) {
  const waterRef = useRef<THREE.Mesh>(null);
  const waterNormal = useTexture("/assets/textures/water/water-normal.jpg");

  const preset =
    WATER_PRESETS.find((waterPreset) => waterPreset.key === waterKey) ??
    WATER_PRESETS[0];

  const configuredNormal = useMemo(() => {
    const texture = waterNormal.clone();

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(length / 2, width / 2);
    texture.needsUpdate = true;

    return texture;
  }, [length, waterNormal, width]);

  const normalScale = useMemo(() => new THREE.Vector2(0.08, 0.08), []);

  useFrame(({ clock }) => {
    if (!waterRef.current) return;

    // Only animate the mesh itself. This is safe for React/ESLint.
    waterRef.current.position.y =
      0.045 + Math.sin(clock.elapsedTime * 1.4) * 0.01;

    // Very subtle movement so the water does not look frozen.
    waterRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.25) * 0.004;
  });

  return (
    <mesh
      ref={waterRef}
      renderOrder={3}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.045, 0]}
    >
      <planeGeometry
        args={[
          Math.max(length - 0.48, 1),
          Math.max(width - 0.48, 1),
          48,
          24,
        ]}
      />

      <meshPhysicalMaterial
        color={preset.color}
        normalMap={configuredNormal}
        normalScale={normalScale}
        roughness={0.04}
        metalness={0}
        transparent
        opacity={0.32}
        depthWrite={false}
        side={THREE.DoubleSide}
        clearcoat={1}
        clearcoatRoughness={0.08}
      />
    </mesh>
  );
}

/**
 * Visible shallow-end entry steps.
 *
 * Important POC decision:
 * Real underwater steps can become hard to see because water, shadows,
 * camera angle, and tile colors hide them. For client demo, we make
 * the step top surfaces intentionally visible with a light aqua ceramic look.
 *
 * These are still placed inside the pool at the shallow end.
 */
function PoolSteps({
  length,
  width,
  depth,
}: {
  length: number;
  width: number;
  depth: number;
}) {
  const stepWidth = Math.max(width - 0.95, 1.5);
  const startX = -length / 2 + 0.65;

  return (
    <group>
      {/* Large top entry platform */}
      <mesh
        castShadow
        receiveShadow
        renderOrder={4}
        position={[startX, -depth * 0.12, 0]}
      >
        <boxGeometry args={[0.55, 0.08, stepWidth]} />
        <meshStandardMaterial
          color="#d9fbff"
          roughness={0.28}
          metalness={0.02}
          transparent
          opacity={0.92}
          depthWrite={false}
          emissive="#22d3ee"
          emissiveIntensity={0.06}
        />
      </mesh>

      {/* Middle step */}
      <mesh
        castShadow
        receiveShadow
        renderOrder={4}
        position={[startX + 0.55, -depth * 0.26, 0]}
      >
        <boxGeometry args={[0.55, 0.08, stepWidth - 0.35]} />
        <meshStandardMaterial
          color="#aef3ff"
          roughness={0.3}
          metalness={0.02}
          transparent
          opacity={0.9}
          depthWrite={false}
          emissive="#22d3ee"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Bottom step */}
      <mesh
        castShadow
        receiveShadow
        renderOrder={4}
        position={[startX + 1.1, -depth * 0.4, 0]}
      >
        <boxGeometry args={[0.55, 0.08, stepWidth - 0.7]} />
        <meshStandardMaterial
          color="#7deaff"
          roughness={0.32}
          metalness={0.02}
          transparent
          opacity={0.88}
          depthWrite={false}
          emissive="#22d3ee"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Thin bright outline lines on each step.
          These make steps visible even from top camera angles. */}
      <mesh renderOrder={5} position={[startX + 0.28, 0.065, 0]}>
        <boxGeometry args={[0.035, 0.012, stepWidth]} />
        <meshBasicMaterial color="#e0ffff" transparent opacity={0.85} />
      </mesh>

      <mesh renderOrder={5} position={[startX + 0.83, 0.066, 0]}>
        <boxGeometry args={[0.035, 0.012, stepWidth - 0.35]} />
        <meshBasicMaterial color="#e0ffff" transparent opacity={0.75} />
      </mesh>

      <mesh renderOrder={5} position={[startX + 1.38, 0.067, 0]}>
        <boxGeometry args={[0.035, 0.012, stepWidth - 0.7]} />
        <meshBasicMaterial color="#e0ffff" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

/**
 * Cyan accent line around the pool.
 *
 * For client demo language, this can be presented as optional LED lighting.
 */
function AccentRim({ length, width }: { length: number; width: number }) {
  return (
    <group>
      <mesh position={[0, 0.23, width / 2 + 0.52]}>
        <boxGeometry args={[length + 0.8, 0.035, 0.035]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.8} />
      </mesh>

      <mesh position={[0, 0.23, -width / 2 - 0.52]}>
        <boxGeometry args={[length + 0.8, 0.035, 0.035]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

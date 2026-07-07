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
} from "@/config/materials";
import { usePoolStore } from "@/store/usePoolStore";

type TexturePaths = {
  baseColor: string;
  normal?: string;
  roughness?: string;
};

/**
 * Visual-polished procedural pool scene.
 *
 * This is still procedural and controlled by sliders, but it is styled to look
 * more like a premium client demo:
 * - thinner deck slab
 * - clean coping frame
 * - depth shadow inside pool
 * - glossy transparent water
 * - visible 3D entry steps
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

      <DepthShadow length={dimensions.length} width={dimensions.width} />

      <PoolSteps
        length={dimensions.length}
        width={dimensions.width}
        depth={dimensions.depth}
      />

      <AnimatedWater
        length={dimensions.length}
        width={dimensions.width}
        waterKey={materials.water}
      />

      <AccentRim length={dimensions.length} width={dimensions.width} />
    </group>
  );
}

/**
 * Loads and prepares a texture set for repeating.
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
  }, [
    baseColor,
    normal,
    roughness,
    paths.normal,
    paths.roughness,
    repeatX,
    repeatY,
  ]);
}

/**
 * Shared PBR texture material.
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
 * Thinner premium patio/deck base.
 *
 * Earlier deck was too blocky. This version is thinner and wider, with a
 * subtle dark base below it to make the top surface feel cleaner.
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
  const deckLength = length + 3.8;
  const deckWidth = width + 3.8;

  const deckMaterial =
    MATERIAL_LIBRARY.deck.find((material) => material.key === deckKey) ??
    MATERIAL_LIBRARY.deck[0];

  return (
    <group>
      {/* Thin dark underside gives visual separation from background. */}
      <mesh receiveShadow position={[0, -0.18, 0]}>
        <boxGeometry args={[deckLength, 0.08, deckWidth]} />
        <meshStandardMaterial color="#4b463d" roughness={0.9} />
      </mesh>

      {/* Main patio surface. */}
      <mesh receiveShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[deckLength, 0.08, deckWidth]} />
        <TexturedMaterial
          paths={deckMaterial.maps}
          repeatX={deckLength / 1.15}
          repeatY={deckWidth / 1.15}
          fallbackColor="#b8aa93"
          roughness={0.88}
        />
      </mesh>
    </group>
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
  const wallThickness = 0.16;
  const copingThickness = 0.3;
  const copingHeight = 0.16;

  const poolTile =
    MATERIAL_LIBRARY.pool.find((material) => material.key === poolTileKey) ??
    MATERIAL_LIBRARY.pool[0];

  const coping =
    MATERIAL_LIBRARY.coping.find((material) => material.key === copingKey) ??
    MATERIAL_LIBRARY.coping[0];

  return (
    <group>
      {/* Pool floor sits below the deck. */}
      <mesh receiveShadow position={[0, -depth, 0]}>
        <boxGeometry args={[length, 0.1, width]} />
        <TexturedMaterial
          paths={poolTile.maps}
          repeatX={length / 1.05}
          repeatY={width / 1.05}
          fallbackColor="#0ea5e9"
          roughness={0.34}
        />
      </mesh>

      {/* Long walls */}
      <mesh castShadow receiveShadow position={[0, -depth / 2, width / 2]}>
        <boxGeometry args={[length, depth, wallThickness]} />
        <TexturedMaterial
          paths={poolTile.maps}
          repeatX={length / 1.05}
          repeatY={depth / 0.65}
          fallbackColor="#0284c7"
          roughness={0.4}
        />
      </mesh>

      <mesh castShadow receiveShadow position={[0, -depth / 2, -width / 2]}>
        <boxGeometry args={[length, depth, wallThickness]} />
        <TexturedMaterial
          paths={poolTile.maps}
          repeatX={length / 1.05}
          repeatY={depth / 0.65}
          fallbackColor="#0284c7"
          roughness={0.4}
        />
      </mesh>

      {/* Short walls */}
      <mesh castShadow receiveShadow position={[length / 2, -depth / 2, 0]}>
        <boxGeometry args={[wallThickness, depth, width]} />
        <TexturedMaterial
          paths={poolTile.maps}
          repeatX={width / 1.05}
          repeatY={depth / 0.65}
          fallbackColor="#0369a1"
          roughness={0.4}
        />
      </mesh>

      <mesh castShadow receiveShadow position={[-length / 2, -depth / 2, 0]}>
        <boxGeometry args={[wallThickness, depth, width]} />
        <TexturedMaterial
          paths={poolTile.maps}
          repeatX={width / 1.05}
          repeatY={depth / 0.65}
          fallbackColor="#0369a1"
          roughness={0.4}
        />
      </mesh>

      {/* Premium stone coping frame */}
      <mesh
        castShadow
        receiveShadow
        position={[0, 0.09, width / 2 + copingThickness / 2]}
      >
        <boxGeometry
          args={[length + copingThickness * 2, copingHeight, copingThickness]}
        />
        <TexturedMaterial
          paths={coping.maps}
          repeatX={length / 0.95}
          repeatY={1}
          fallbackColor="#d6d1c6"
          roughness={0.8}
        />
      </mesh>

      <mesh
        castShadow
        receiveShadow
        position={[0, 0.09, -width / 2 - copingThickness / 2]}
      >
        <boxGeometry
          args={[length + copingThickness * 2, copingHeight, copingThickness]}
        />
        <TexturedMaterial
          paths={coping.maps}
          repeatX={length / 0.95}
          repeatY={1}
          fallbackColor="#d6d1c6"
          roughness={0.8}
        />
      </mesh>

      <mesh
        castShadow
        receiveShadow
        position={[length / 2 + copingThickness / 2, 0.09, 0]}
      >
        <boxGeometry args={[copingThickness, copingHeight, width]} />
        <TexturedMaterial
          paths={coping.maps}
          repeatX={width / 0.95}
          repeatY={1}
          fallbackColor="#c9c2b6"
          roughness={0.8}
        />
      </mesh>

      <mesh
        castShadow
        receiveShadow
        position={[-length / 2 - copingThickness / 2, 0.09, 0]}
      >
        <boxGeometry args={[copingThickness, copingHeight, width]} />
        <TexturedMaterial
          paths={coping.maps}
          repeatX={width / 0.95}
          repeatY={1}
          fallbackColor="#c9c2b6"
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}

/**
 * Dark inset just below the water.
 *
 * This gives a stronger pool-depth illusion and helps water stand out.
 */
function DepthShadow({ length, width }: { length: number; width: number }) {
  return (
    <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[Math.max(length - 0.36, 1), Math.max(width - 0.36, 1)]} />
      <meshBasicMaterial
        color="#061827"
        transparent
        opacity={0.32}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * More believable shallow-end entry steps.
 *
 * They are actual blocks at different depths, not just top lines.
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
  const stepWidth = Math.max(width - 1.05, 1.5);
  const startX = -length / 2 + 0.65;

  const stepMaterial = (
    <meshStandardMaterial
      color="#baf7ff"
      roughness={0.24}
      metalness={0.02}
      emissive="#0ea5e9"
      emissiveIntensity={0.04}
    />
  );

  return (
    <group>
      <mesh
        castShadow
        receiveShadow
        position={[startX, -depth * 0.13, 0]}
      >
        <boxGeometry args={[0.58, 0.12, stepWidth]} />
        {stepMaterial}
      </mesh>

      <mesh
        castShadow
        receiveShadow
        position={[startX + 0.58, -depth * 0.29, 0]}
      >
        <boxGeometry args={[0.58, 0.12, stepWidth - 0.38]} />
        {stepMaterial}
      </mesh>

      <mesh
        castShadow
        receiveShadow
        position={[startX + 1.16, -depth * 0.45, 0]}
      >
        <boxGeometry args={[0.58, 0.12, stepWidth - 0.76]} />
        {stepMaterial}
      </mesh>
    </group>
  );
}

/**
 * Glossier water with normal map.
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
    texture.repeat.set(length / 1.7, width / 1.7);
    texture.needsUpdate = true;

    return texture;
  }, [length, waterNormal, width]);

  const normalScale = useMemo(() => new THREE.Vector2(0.07, 0.07), []);

  useFrame(({ clock }) => {
    if (!waterRef.current) return;

    waterRef.current.position.y =
      0.045 + Math.sin(clock.elapsedTime * 1.4) * 0.008;

    waterRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.25) * 0.003;
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
          64,
          32,
        ]}
      />

      <meshPhysicalMaterial
        color={preset.color}
        normalMap={configuredNormal}
        normalScale={normalScale}
        roughness={0.02}
        metalness={0}
        transparent
        opacity={0.36}
        depthWrite={false}
        side={THREE.DoubleSide}
        clearcoat={1}
        clearcoatRoughness={0.04}
      />
    </mesh>
  );
}

/**
 * Subtle LED accent strips.
 */
function AccentRim({ length, width }: { length: number; width: number }) {
  return (
    <group>
      <mesh position={[0, 0.175, width / 2 + 0.44]}>
        <boxGeometry args={[length + 0.6, 0.03, 0.03]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.8} />
      </mesh>

      <mesh position={[0, 0.175, -width / 2 - 0.44]}>
        <boxGeometry args={[length + 0.6, 0.03, 0.03]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

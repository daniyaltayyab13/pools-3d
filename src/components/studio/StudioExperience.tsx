"use client";

import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { IfInSessionMode, XR } from "@react-three/xr";
import { RotateCcw, Ruler, Sparkles, Waves } from "lucide-react";
import type { ReactNode } from "react";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { MATERIAL_LIBRARY, WATER_PRESETS } from "@/config/materials";
import type {
  CopingMaterialKey,
  DeckMaterialKey,
  PoolTileKey,
  WaterColorKey,
} from "@/config/materials";
import { PwaInstallCard } from "@/components/pwa/PwaInstallCard";
import { ArLaunchButton } from "@/components/studio/ArLaunchButton";
import { ArPlacementScene } from "@/components/studio/ArPlacementScene";
import { ProceduralPoolScene } from "@/components/studio/ProceduralPoolScene";
import { xrStore } from "@/components/studio/xrStore";
import { usePoolStore } from "@/store/usePoolStore";

/**
 * Main studio experience.
 *
 * Polish Step 11A:
 * - Desktop: canvas + fixed right sidebar
 * - Mobile: full-screen canvas + bottom sheet controls
 * - AR button floats above the mobile bottom sheet
 * - Camera/controls tuned so pool does not feel tiny on phone
 */
export function StudioExperience() {
  const dimensions = usePoolStore((state) => state.dimensions);
  const materials = usePoolStore((state) => state.materials);
  const setDimension = usePoolStore((state) => state.setDimension);
  const setMaterial = usePoolStore((state) => state.setMaterial);
  const resetDimensions = usePoolStore((state) => state.resetDimensions);

  return (
    <main className="h-[100svh] overflow-hidden bg-[#07111f] text-white">
      <div className="relative h-full lg:flex">
        {/* 3D preview area */}
        <section className="relative h-[100svh] flex-1 overflow-hidden border-white/10 bg-[#07111f] lg:border-r">
          <div className="absolute left-4 top-4 z-30 sm:left-5 sm:top-5">
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur transition hover:bg-black/45"
            >
              ← Back
            </Link>
          </div>

          {/* Mobile compact status badge.
              Desktop gets a larger info card. */}
          <div className="absolute left-4 right-4 top-16 z-20 rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur sm:left-5 sm:right-auto sm:top-20 sm:max-w-[315px] sm:p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Live Pool Studio
            </p>
            <p className="mt-1 hidden text-sm leading-6 text-slate-300 sm:block">
              Customize dimensions, finishes, water, and preview the pool in AR.
            </p>
          </div>

          <Canvas
            className="h-full w-full"
            camera={{
              // Slightly closer and wider so mobile view does not look tiny.
              position: [8.5, 5.8, 9.5],
              fov: 48,
            }}
            shadows
            dpr={[1, 2]}
            gl={{
              antialias: true,
              alpha: false,
            }}
          >
            <Suspense fallback={null}>
              <XR store={xrStore}>
                {/* Normal studio scene.
                    Denied in immersive AR so OrbitControls never fights AR camera. */}
                <IfInSessionMode deny="immersive-ar">
                  <color attach="background" args={["#07111f"]} />

                  <SceneLights />
                  <ProceduralPoolScene />

                  <ContactShadows
                    position={[0, -0.24, 0]}
                    opacity={0.45}
                    scale={24}
                    blur={3}
                    far={7}
                  />

                  <StableOrbitControls />
                </IfInSessionMode>

                {/* Android AR placement scene. */}
                <IfInSessionMode allow="immersive-ar">
                  <SceneLights />
                  <ArPlacementScene />
                </IfInSessionMode>
              </XR>
            </Suspense>
          </Canvas>

          <ArLaunchButton />
        </section>

        {/* Controls panel.
            Mobile: bottom sheet overlay.
            Desktop: right sidebar. */}
        <aside className="fixed inset-x-0 bottom-0 z-20 max-h-[42svh] overflow-y-auto rounded-t-[2rem] border-t border-white/10 bg-[#0b1628]/95 p-4 shadow-[0_-28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:static lg:z-auto lg:h-[100svh] lg:max-h-none lg:w-[380px] lg:rounded-none lg:border-l lg:border-t-0 lg:bg-[#0b1628] lg:p-5 lg:shadow-none">
          {/* Mobile drag handle visual */}
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 lg:hidden" />

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              Pool Configurator
            </p>
            <h1 className="mt-2 text-xl font-black text-white sm:text-2xl">
              Design Controls
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Customize size, finishes, water, and preview in AR.
            </p>
          </div>

          <div className="mt-5 space-y-5 pb-6 lg:mt-8">
            <ControlCard
              icon={<Ruler className="h-4 w-4 text-cyan-300" />}
              title="Dimensions"
              description="Live procedural geometry"
            >
              <DimensionSlider
                label="Length"
                unit="m"
                value={dimensions.length}
                min={5}
                max={12}
                step={0.5}
                onChange={(value) => setDimension("length", value)}
              />

              <DimensionSlider
                label="Width"
                unit="m"
                value={dimensions.width}
                min={2.5}
                max={6}
                step={0.25}
                onChange={(value) => setDimension("width", value)}
              />

              <DimensionSlider
                label="Depth"
                unit="m"
                value={dimensions.depth}
                min={1}
                max={2.5}
                step={0.1}
                onChange={(value) => setDimension("depth", value)}
              />

              <button
                onClick={resetDimensions}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/[0.08]"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Dimensions
              </button>
            </ControlCard>

            <ControlCard
              icon={<Sparkles className="h-4 w-4 text-cyan-300" />}
              title="Pool Tile"
              description="Uploaded pool tile assets"
            >
              <div className="grid grid-cols-2 gap-3">
                {MATERIAL_LIBRARY.pool.map((material) => (
                  <TextureSwatch
                    key={material.key}
                    label={material.name}
                    description={material.description}
                    imageUrl={material.maps.baseColor}
                    selected={materials.poolTile === material.key}
                    onClick={() =>
                      setMaterial("poolTile", material.key as PoolTileKey)
                    }
                  />
                ))}
              </div>
            </ControlCard>

            <ControlCard
              icon={<Sparkles className="h-4 w-4 text-cyan-300" />}
              title="Coping"
              description="Pool edge stone"
            >
              <div className="grid grid-cols-1 gap-3">
                {MATERIAL_LIBRARY.coping.map((material) => (
                  <TextureSwatch
                    key={material.key}
                    label={material.name}
                    description={material.description}
                    imageUrl={material.maps.baseColor}
                    selected={materials.coping === material.key}
                    onClick={() =>
                      setMaterial("coping", material.key as CopingMaterialKey)
                    }
                  />
                ))}
              </div>
            </ControlCard>

            <ControlCard
              icon={<Sparkles className="h-4 w-4 text-cyan-300" />}
              title="Deck"
              description="Patio material"
            >
              <div className="grid grid-cols-1 gap-3">
                {MATERIAL_LIBRARY.deck.map((material) => (
                  <TextureSwatch
                    key={material.key}
                    label={material.name}
                    description={material.description}
                    imageUrl={material.maps.baseColor}
                    selected={materials.deck === material.key}
                    onClick={() =>
                      setMaterial("deck", material.key as DeckMaterialKey)
                    }
                  />
                ))}
              </div>
            </ControlCard>

            <ControlCard
              icon={<Waves className="h-4 w-4 text-cyan-300" />}
              title="Water Color"
              description="Live water presets"
            >
              <div className="grid grid-cols-2 gap-3">
                {WATER_PRESETS.map((preset) => (
                  <WaterSwatch
                    key={preset.key}
                    label={preset.name}
                    color={preset.color}
                    secondary={preset.secondary}
                    selected={materials.water === preset.key}
                    onClick={() =>
                      setMaterial("water", preset.key as WaterColorKey)
                    }
                  />
                ))}
              </div>
            </ControlCard>

            <PwaInstallCard />
          </div>
        </aside>
      </div>
    </main>
  );
}

/**
 * Studio lighting tuned for a cleaner sales-demo look.
 */
function SceneLights() {
  return (
    <>
      <hemisphereLight args={["#d8f7ff", "#172033", 2.05]} />

      <directionalLight
        castShadow
        position={[7, 9, 6]}
        intensity={3.9}
        shadow-mapSize={[1536, 1536]}
      />

      <pointLight position={[-5, 3, -4]} intensity={5.2} color="#22d3ee" />
      <pointLight position={[4, 2.5, 4]} intensity={2.4} color="#fbbf24" />
    </>
  );
}

/**
 * Stable camera controls for the 3D studio.
 *
 * UX:
 * - Left drag = rotate
 * - Wheel = zoom
 * - Right drag = pan
 *
 * Pan is bounded so the orbit target cannot drift too far and break rotation.
 */
function StableOrbitControls() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useFrame(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    const target = controls.target;
    const maxPanDistance = 5.5;

    target.x = THREE.MathUtils.clamp(
      target.x,
      -maxPanDistance,
      maxPanDistance
    );

    target.z = THREE.MathUtils.clamp(
      target.z,
      -maxPanDistance,
      maxPanDistance
    );

    target.y = THREE.MathUtils.lerp(target.y, -0.35, 0.18);

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableRotate={true}
      enableZoom={true}
      enablePan={true}
      enableDamping={true}
      dampingFactor={0.08}
      rotateSpeed={0.72}
      zoomSpeed={0.85}
      panSpeed={0.72}
      screenSpacePanning={false}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
      minDistance={3.2}
      maxDistance={42}
      minPolarAngle={0.16}
      maxPolarAngle={Math.PI / 2.05}
      target={[0, -0.35, 0]}
    />
  );
}

/**
 * Reusable settings card.
 */
function ControlCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-bold text-white">{title}</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * Real range slider for live pool dimensions.
 */
function DimensionSlider({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const progressPercent = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200">
          {value.toFixed(1)}
          {unit}
        </span>
      </div>

      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-300"
        style={{
          background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${progressPercent}%, #334155 ${progressPercent}%, #334155 100%)`,
        }}
      />

      <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-500">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

/**
 * Texture swatch used for pool tile, coping, and deck materials.
 */
function TextureSwatch({
  label,
  description,
  imageUrl,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  imageUrl: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-2 text-left transition ${
        selected
          ? "border-cyan-300 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
          : "border-white/10 bg-black/20 hover:border-cyan-300/40"
      }`}
    >
      <div
        className="h-16 rounded-xl bg-cover bg-center"
        style={{
          backgroundImage: `url(${imageUrl})`,
        }}
      />
      <p className="mt-2 text-sm font-bold text-white">{label}</p>
      <p className="mt-0.5 text-xs leading-5 text-slate-400">{description}</p>
    </button>
  );
}

/**
 * Water color preset swatch.
 */
function WaterSwatch({
  label,
  color,
  secondary,
  selected,
  onClick,
}: {
  label: string;
  color: string;
  secondary: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-2 text-left transition ${
        selected
          ? "border-cyan-300 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
          : "border-white/10 bg-black/20 hover:border-cyan-300/40"
      }`}
    >
      <div
        className="h-14 rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${color}, ${secondary})`,
        }}
      />
      <p className="mt-2 text-sm font-bold text-white">{label}</p>
    </button>
  );
}

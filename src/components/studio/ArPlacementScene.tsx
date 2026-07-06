"use client";

import { XRDomOverlay, useXRHitTest } from "@react-three/xr";
import { RotateCcw, ScanLine, X } from "lucide-react";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { ProceduralPoolScene } from "@/components/studio/ProceduralPoolScene";
import { xrStore } from "@/components/studio/xrStore";

type PlacedPool = {
  position: [number, number, number];
};

/**
 * Android AR placement scene.
 *
 * This component only renders during immersive AR.
 *
 * Flow:
 * 1. useXRHitTest tracks where the phone/camera ray hits a detected plane.
 * 2. A reticle follows that hit position.
 * 3. User presses "Place Pool".
 * 4. Current procedural pool is placed at that real-world position.
 */
export function ArPlacementScene() {
  const reticleRef = useRef<THREE.Mesh>(null);

  /**
   * Refs are used for frame-by-frame XR hit-test data.
   * We avoid React state here because hit testing runs every frame.
   */
  const hitMatrixRef = useRef(new THREE.Matrix4());
  const latestHitPositionRef = useRef(new THREE.Vector3());
  const hasValidHitRef = useRef(false);

  const [placedPool, setPlacedPool] = useState<PlacedPool | null>(null);
  const [isPlacementMode, setIsPlacementMode] = useState(true);
  const [message, setMessage] = useState(
    "Move your phone slowly and point at the ground."
  );

  /**
   * Continuous AR hit test.
   *
   * 'viewer' means the ray comes from the device/camera view.
   * 'plane' means we are looking for detected real-world flat surfaces.
   */
  useXRHitTest(
    (results, getWorldMatrix) => {
      if (!isPlacementMode) {
        return;
      }

      if (results.length === 0) {
        hasValidHitRef.current = false;
        return;
      }

      getWorldMatrix(hitMatrixRef.current, results[0]);
      latestHitPositionRef.current.setFromMatrixPosition(hitMatrixRef.current);
      hasValidHitRef.current = true;
    },
    "viewer",
    "plane"
  );

  /**
   * Move the reticle every frame without triggering React re-renders.
   */
  useFrame(({ clock }) => {
    if (!reticleRef.current) {
      return;
    }

    reticleRef.current.visible = isPlacementMode && hasValidHitRef.current;

    if (hasValidHitRef.current) {
      reticleRef.current.position.copy(latestHitPositionRef.current);

      // Small pulse so the reticle feels alive.
      const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.06;
      reticleRef.current.scale.setScalar(pulse);
    }
  });

  const handlePlacePool = () => {
    if (!hasValidHitRef.current) {
      setMessage("No ground detected yet. Move your phone slowly and try again.");
      return;
    }

    const position = latestHitPositionRef.current;

    /**
     * The model origin is slightly below/around deck level.
     * We lift it a little so deck/pool top feels aligned with the detected ground.
     */
    setPlacedPool({
      position: [position.x, position.y + 0.13, position.z],
    });

    setIsPlacementMode(false);
    setMessage("Pool placed. Use Move Again if you want to reposition it.");
  };

  const handleMoveAgain = () => {
    setPlacedPool(null);
    setIsPlacementMode(true);
    setMessage("Move your phone slowly and point at the ground.");
  };

  const handleExitAr = () => {
    xrStore.getState().session?.end();
  };

  return (
    <>
      {/* Reticle: yellow placement ring on detected ground. */}
      <mesh
        ref={reticleRef}
        visible={false}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={10}
      >
        <torusGeometry args={[0.42, 0.018, 12, 64]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </mesh>

      {/* Placed pool. It uses the exact same live dimensions/materials from the studio. */}
      {placedPool ? (
        <group position={placedPool.position}>
          <ProceduralPoolScene />
        </group>
      ) : null}

      {/* AR HTML overlay. Visible inside handheld AR. */}
      <XRDomOverlay>
        <div className="pointer-events-none fixed inset-0 z-[9999] flex flex-col justify-between p-4 text-white">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-400 p-2 text-slate-950">
                <ScanLine className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-black">AR Pool Placement</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {message}
                </p>
              </div>

              <button
                onClick={handleExitAr}
                className="rounded-full bg-white/10 p-2 text-slate-200"
                aria-label="Exit AR"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="pointer-events-auto flex gap-3">
            {isPlacementMode ? (
              <button
                onClick={handlePlacePool}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-4 text-sm font-black text-slate-950 shadow-[0_0_36px_rgba(251,191,36,0.42)]"
              >
                <ScanLine className="h-4 w-4" />
                Place Pool
              </button>
            ) : (
              <button
                onClick={handleMoveAgain}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950 shadow-[0_0_36px_rgba(34,211,238,0.34)]"
              >
                <RotateCcw className="h-4 w-4" />
                Move Again
              </button>
            )}

            <button
              onClick={handleExitAr}
              className="rounded-full border border-white/10 bg-slate-950/80 px-5 py-4 text-sm font-black text-white backdrop-blur"
            >
              Exit
            </button>
          </div>
        </div>
      </XRDomOverlay>
    </>
  );
}

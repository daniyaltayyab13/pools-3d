import { createXRStore } from "@react-three/xr";

/**
 * Shared XR store for the whole studio.
 *
 * hitTest:
 * - allows Android AR to detect real-world floor/ground surfaces.
 *
 * domOverlay:
 * - allows us to show HTML buttons inside handheld AR:
 *   Place Pool, Move Again, Exit AR.
 */
export const xrStore = createXRStore({
  hitTest: true,
  domOverlay: true,
});
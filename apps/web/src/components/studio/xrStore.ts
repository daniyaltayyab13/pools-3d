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
 * 
 * * offerSession=false:
 * Hides the default browser/library "Enter XR" button.
 * We use our own custom "View in Your Backyard" button instead.
 */
export const xrStore = createXRStore({
  hitTest: true,
  domOverlay: true,
  offerSession: false,
});
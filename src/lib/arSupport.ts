/**
 * Small browser helpers for AR support detection.
 *
 * Android Chrome:
 * - may support WebXR immersive-ar
 *
 * iPhone Safari:
 * - does not use WebXR AR for our path
 * - later we use USDZ + AR Quick Look
 */

type NavigatorWithXR = Navigator & {
  xr?: {
    isSessionSupported: (mode: "immersive-ar") => Promise<boolean>;
  };
};

export function isIOSDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export async function isWebXRArSupported() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithXR = window.navigator as NavigatorWithXR;

  if (!navigatorWithXR.xr) {
    return false;
  }

  try {
    return await navigatorWithXR.xr.isSessionSupported("immersive-ar");
  } catch {
    return false;
  }
}

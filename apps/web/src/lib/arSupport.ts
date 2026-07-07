/**
 * Browser helpers for AR support detection.
 *
 * Android:
 * - WebXR immersive-ar
 *
 * iPhone:
 * - Apple AR Quick Look with USDZ
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

/**
 * Checks Apple AR Quick Look support.
 *
 * Safari/WebKit exposes this through relList.supports("ar").
 */
export function isQuickLookArSupported() {
  if (typeof document === "undefined") {
    return false;
  }

  const anchor = document.createElement("a");

  return Boolean(anchor.relList?.supports?.("ar"));
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

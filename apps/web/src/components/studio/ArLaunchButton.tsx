"use client";

import { ExternalLink, Loader2, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  isIOSDevice,
  isQuickLookArSupported,
  isWebXRArSupported,
} from "@/lib/arSupport";
import {
  createIphoneArPreview,
  type IphoneArPreviewResponse,
} from "@/lib/apiClient";
import { xrStore } from "@/components/studio/xrStore";
import { usePoolStore } from "@/store/usePoolStore";

type ArMode =
  | "checking"
  | "android-supported"
  | "ios-quicklook"
  | "ios-needs-safari"
  | "unsupported";

/**
 * AR launch button.
 *
 * Android:
 * - starts WebXR AR session directly
 *
 * iPhone Safari:
 * - sends current design config to the backend
 * - backend generates a dynamic USDZ file
 * - user taps the returned Apple Quick Look link
 *
 * iPhone non-Safari / unsupported browsers:
 * - shows clear guidance
 */
export function ArLaunchButton({
  isMobileControlsOpen = false,
}: {
  isMobileControlsOpen?: boolean;
}) {
  const dimensions = usePoolStore((state) => state.dimensions);
  const materials = usePoolStore((state) => state.materials);

  const [mode, setMode] = useState<ArMode>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [showQuickLookLink, setShowQuickLookLink] = useState(false);
  const [iphonePreview, setIphonePreview] =
    useState<IphoneArPreviewResponse | null>(null);
  const [isPreparingIphonePreview, setIsPreparingIphonePreview] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    async function detectArSupport() {
      if (isIOSDevice()) {
        if (!isMounted) {
          return;
        }

        setMode(
          isQuickLookArSupported() ? "ios-quicklook" : "ios-needs-safari"
        );
        return;
      }

      const supported = await isWebXRArSupported();

      if (isMounted) {
        setMode(supported ? "android-supported" : "unsupported");
      }
    }

    detectArSupport();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * When design changes, old generated USDZ link becomes stale.
   * User should generate a fresh iPhone AR preview for the latest design.
   */
  useEffect(() => {
    setIphonePreview(null);
    setShowQuickLookLink(false);
  }, [
    dimensions.length,
    dimensions.width,
    dimensions.depth,
    materials.poolTile,
    materials.coping,
    materials.deck,
    materials.water,
  ]);

  const handleClick = async () => {
    setMessage(null);
    setShowQuickLookLink(false);

    if (mode === "checking") {
      setMessage("Checking AR support on this device...");
      return;
    }

    if (mode === "ios-quicklook") {
      await prepareIphoneArPreview();
      return;
    }

    if (mode === "ios-needs-safari") {
      setMessage(
        "This iPhone browser does not expose Apple AR Quick Look properly. Open the same URL in Safari, then tap View in iPhone AR again."
      );
      return;
    }

    if (mode === "unsupported") {
      setMessage(
        "WebXR AR is not available on this browser/device. Android AR works on supported Android Chrome over HTTPS. iPhone AR works through Safari and Apple AR Quick Look."
      );
      return;
    }

    try {
      await xrStore.enterAR();
    } catch {
      setMessage(
        "Could not start AR. Make sure you are on Android Chrome and using HTTPS."
      );
    }
  };

  const prepareIphoneArPreview = async () => {
    try {
      setIsPreparingIphonePreview(true);
      setIphonePreview(null);
      setMessage("Preparing dynamic iPhone AR preview from current design...");

      const result = await createIphoneArPreview({
        version: 1,
        shape: "rectangular",
        dimensions,
        materials,
        source: "ar",
      });

      setIphonePreview(result.data);
      setShowQuickLookLink(true);
      setMessage(
        `Dynamic iPhone AR preview is ready. Mode: ${result.data.mode}. Tap Open in Apple AR Quick Look.`
      );
    } catch (error) {
      setIphonePreview(null);
      setShowQuickLookLink(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not prepare iPhone AR preview."
      );
    } finally {
      setIsPreparingIphonePreview(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPreparingIphonePreview}
        className={`absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_0_40px_rgba(251,191,36,0.42)] transition hover:bg-amber-300 disabled:cursor-wait disabled:bg-slate-700 disabled:text-slate-400 lg:bottom-6 ${
          isMobileControlsOpen
            ? "pointer-events-none bottom-[72svh] opacity-0 lg:pointer-events-auto lg:opacity-100"
            : "bottom-[170px]"
        }`}
      >
        {isPreparingIphonePreview ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Smartphone className="h-4 w-4" />
        )}

        {isPreparingIphonePreview ? "Preparing iPhone AR..." : getButtonLabel(mode)}
      </button>

      {message ? (
        <div className="absolute bottom-[220px] left-1/2 z-40 w-[min(460px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur lg:bottom-24">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-400 p-2 text-slate-950">
              <Smartphone className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold">AR Preview</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{message}</p>

              {showQuickLookLink && iphonePreview ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-slate-300">
                    <p>
                      <span className="font-bold text-white">Mode:</span>{" "}
                      {iphonePreview.mode}
                    </p>
                    <p>
                      <span className="font-bold text-white">Status:</span>{" "}
                      {iphonePreview.quickLook.status}
                    </p>
                    <p className="break-all">
                      <span className="font-bold text-white">USDZ:</span>{" "}
                      {iphonePreview.quickLook.href}
                    </p>
                  </div>

                  <a
                    href={iphonePreview.quickLook.href}
                    rel="ar"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(251,191,36,0.32)]"
                  >
                    {/* Apple Quick Look works best with rel="ar" anchor and an image child. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icons/pools-3d-icon.svg"
                      alt=""
                      className="h-5 w-5 rounded"
                    />
                    <span>Open in Apple AR Quick Look</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setShowQuickLookLink(false);
              }}
              className="rounded-full bg-white/10 p-1.5 text-slate-300 transition hover:bg-white/15 hover:text-white"
              aria-label="Close AR message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function getButtonLabel(mode: ArMode) {
  if (mode === "checking") {
    return "Checking AR...";
  }

  if (mode === "ios-quicklook") {
    return "View in iPhone AR";
  }

  if (mode === "ios-needs-safari") {
    return "Open in Safari for AR";
  }

  return "View in Your Backyard";
}

"use client";

import { Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isIOSDevice, isWebXRArSupported } from "@/lib/arSupport";
import { createPoolUsdzUrl } from "@/lib/createPoolUsdz";
import { xrStore } from "@/components/studio/xrStore";
import { usePoolStore } from "@/store/usePoolStore";

type ArMode = "checking" | "android-supported" | "ios" | "unsupported";

/**
 * AR launch button.
 *
 * Android:
 * - starts WebXR AR session
 *
 * iPhone:
 * - generates a USDZ file from the current design
 * - shows Apple AR Quick Look link
 *
 * Desktop/unsupported:
 * - shows helpful message
 */
export function ArLaunchButton() {
  const dimensions = usePoolStore((state) => state.dimensions);
  const materials = usePoolStore((state) => state.materials);

  const [mode, setMode] = useState<ArMode>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [isPreparingIosAr, setIsPreparingIosAr] = useState(false);
  const [iosUsdzUrl, setIosUsdzUrl] = useState<string | null>(null);

  /**
   * Store object URL in a ref so we can revoke it when a new file is generated.
   */
  const iosUsdzUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function detectArSupport() {
      if (isIOSDevice()) {
        if (isMounted) {
          setMode("ios");
        }
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

      if (iosUsdzUrlRef.current) {
        URL.revokeObjectURL(iosUsdzUrlRef.current);
      }
    };
  }, []);

  const handleClick = async () => {
    setMessage(null);

    if (mode === "checking") {
      setMessage("Checking AR support on this device...");
      return;
    }

    if (mode === "ios") {
      await prepareIosQuickLook();
      return;
    }

    if (mode === "unsupported") {
      setMessage(
        "WebXR AR is not available on this browser/device. Android AR works on supported Android Chrome over HTTPS. iPhone uses Apple AR Quick Look."
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

  const prepareIosQuickLook = async () => {
    try {
      setIsPreparingIosAr(true);
      setIosUsdzUrl(null);

      setMessage(
        "Preparing iPhone AR model from your current pool design. This may take a few seconds."
      );

      if (iosUsdzUrlRef.current) {
        URL.revokeObjectURL(iosUsdzUrlRef.current);
        iosUsdzUrlRef.current = null;
      }

      const url = await createPoolUsdzUrl({
        dimensions,
        materials,
      });

      iosUsdzUrlRef.current = url;
      setIosUsdzUrl(url);

      setMessage(
        "iPhone AR model is ready. Tap Open in Apple AR Quick Look."
      );
    } catch {
      setMessage(
        "Could not prepare iPhone AR model. We can add a static USDZ fallback if this device blocks dynamic export."
      );
    } finally {
      setIsPreparingIosAr(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPreparingIosAr}
        className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_0_40px_rgba(251,191,36,0.42)] transition hover:bg-amber-300 disabled:cursor-wait disabled:bg-slate-600 disabled:text-slate-300"
      >
        <Smartphone className="h-4 w-4" />
        {getButtonLabel({ mode, isPreparingIosAr })}
      </button>

      {message ? (
        <div className="absolute bottom-24 left-1/2 z-30 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-400 p-2 text-slate-950">
              <Smartphone className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold">AR Preview</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{message}</p>

              {iosUsdzUrl ? (
                <a
                  href={iosUsdzUrl}
                  rel="ar"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(251,191,36,0.32)]"
                >
                  {/* AR Quick Look commonly expects an image child inside rel="ar". */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/pools-3d-icon.svg"
                    alt=""
                    className="h-5 w-5 rounded"
                  />
                  Open in Apple AR Quick Look
                </a>
              ) : null}
            </div>

            <button
              onClick={() => setMessage(null)}
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

function getButtonLabel({
  mode,
  isPreparingIosAr,
}: {
  mode: ArMode;
  isPreparingIosAr: boolean;
}) {
  if (isPreparingIosAr) {
    return "Preparing iPhone AR...";
  }

  if (mode === "checking") {
    return "Checking AR...";
  }

  if (mode === "ios") {
    return "Prepare iPhone AR";
  }

  return "View in Your Backyard";
}

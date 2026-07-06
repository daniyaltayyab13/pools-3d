"use client";

import { Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { isIOSDevice, isWebXRArSupported } from "@/lib/arSupport";
import { xrStore } from "@/components/studio/xrStore";

type ArMode = "checking" | "android-supported" | "ios" | "unsupported";

/**
 * AR launch button.
 *
 * For the POC:
 * - Android supported browser: enters WebXR AR
 * - iPhone: shows Quick Look/USDZ message for next step
 * - Desktop/unsupported: shows helpful message
 */
export function ArLaunchButton() {
  const [mode, setMode] = useState<ArMode>("checking");
  const [message, setMessage] = useState<string | null>(null);

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
    };
  }, []);

  const handleClick = async () => {
    setMessage(null);

    if (mode === "checking") {
      setMessage("Checking AR support on this device...");
      return;
    }

    if (mode === "ios") {
      setMessage(
        "iPhone AR uses Apple's AR Quick Look. USDZ export will be added in the next step."
      );
      return;
    }

    if (mode === "unsupported") {
      setMessage(
        "WebXR AR is not available on this browser/device. Test on Android Chrome over HTTPS."
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

  return (
    <>
      <button
        onClick={handleClick}
        className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_0_40px_rgba(251,191,36,0.42)] transition hover:bg-amber-300"
      >
        <Smartphone className="h-4 w-4" />
        {mode === "checking" ? "Checking AR..." : "View in Your Backyard"}
      </button>

      {message ? (
        <div className="absolute bottom-24 left-1/2 z-30 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-400 p-2 text-slate-950">
              <Smartphone className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold">AR Preview</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{message}</p>
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

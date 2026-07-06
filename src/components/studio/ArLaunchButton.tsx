"use client";

import { Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  isIOSDevice,
  isQuickLookArSupported,
  isWebXRArSupported,
} from "@/lib/arSupport";
import { xrStore } from "@/components/studio/xrStore";

type ArMode =
  | "checking"
  | "android-supported"
  | "ios-quicklook"
  | "ios-needs-safari"
  | "unsupported";

const STATIC_IPHONE_USDZ_URL = "/ar/demo-pool.usdz";

/**
 * AR launch button.
 *
 * Android:
 * - starts WebXR AR session
 *
 * iPhone Safari:
 * - opens static USDZ with Apple AR Quick Look
 *
 * iPhone Google/Chrome/WhatsApp in-app browser:
 * - asks user to open in Safari
 */
export function ArLaunchButton() {
  const [mode, setMode] = useState<ArMode>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [showQuickLookLink, setShowQuickLookLink] = useState(false);

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

  const handleClick = async () => {
    setMessage(null);
    setShowQuickLookLink(false);

    if (mode === "checking") {
      setMessage("Checking AR support on this device...");
      return;
    }

    if (mode === "ios-quicklook") {
      setMessage(
        "iPhone AR is ready. Tap Open in Apple AR Quick Look. For best result, use Safari."
      );
      setShowQuickLookLink(true);
      return;
    }

    if (mode === "ios-needs-safari") {
      setMessage(
        "This iPhone browser does not expose Apple AR Quick Look properly. Open the same URL in Safari, then tap View in Your Backyard again."
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

  return (
    <>
      <button
        onClick={handleClick}
        className="absolute bottom-[45svh] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_0_40px_rgba(251,191,36,0.42)] transition hover:bg-amber-300 lg:bottom-6"
      >
        <Smartphone className="h-4 w-4" />
        {getButtonLabel(mode)}
      </button>

      {message ? (
        <div className="absolute bottom-[52svh] left-1/2 z-40 w-[min(460px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur lg:bottom-24">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-400 p-2 text-slate-950">
              <Smartphone className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold">AR Preview</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{message}</p>

              {showQuickLookLink ? (
                <a
                  href={STATIC_IPHONE_USDZ_URL}
                  rel="ar"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(251,191,36,0.32)]"
                >
                  {/* Apple/WebKit recommends rel="ar" anchor with an img child. */}
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

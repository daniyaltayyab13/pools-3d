"use client";

import { CheckCircle2, Download, Info, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Browser event fired when Chrome/Edge decides the app is installable.
 * TypeScript does not include this event by default, so we define it here.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type DeviceState = {
  isIos: boolean;
  isStandalone: boolean;
};

/**
 * Reads browser/PWA environment.
 *
 * We keep this in a function because window/navigator only exist in browser.
 */
function getDeviceState(): DeviceState {
  const userAgent = window.navigator.userAgent.toLowerCase();

  const isIos =
    /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(
      (window.navigator as Navigator & { standalone?: boolean }).standalone
    );

  return {
    isIos,
    isStandalone,
  };
}

/**
 * PWA install card shown in the studio sidebar.
 *
 * Chrome/Android:
 * - Shows real install button when browser allows it.
 *
 * iPhone:
 * - Safari does not show a programmatic install prompt.
 * - User must use Share → Add to Home Screen.
 */
export function PwaInstallCard() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [deviceState, setDeviceState] = useState<DeviceState>({
    isIos: false,
    isStandalone: false,
  });

  useEffect(() => {
    /**
     * ESLint React rule does not like direct setState inside effect body.
     * requestAnimationFrame runs it after the browser paint, so it is not a
     * synchronous cascading render during the effect.
     */
    const frameId = window.requestAnimationFrame(() => {
      setDeviceState(getDeviceState());
    });

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!promptEvent) {
      return;
    }

    await promptEvent.prompt();
    await promptEvent.userChoice;

    setPromptEvent(null);
  };

  if (deviceState.isStandalone) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          <h2 className="font-bold text-white">PWA Installed</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-emerald-100/80">
          App is running in standalone mode. This is the experience we want for
          client demos on phone.
        </p>
      </div>
    );
  }

  if (deviceState.isIos) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-cyan-300" />
          <h2 className="font-bold text-white">Install on iPhone</h2>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          On iPhone, open Safari share menu and choose{" "}
          <span className="font-bold text-white">Add to Home Screen</span>.
        </p>

        <div className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-100">
          iOS does not allow websites to open the install prompt directly, so
          this manual step is expected.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2">
        <Download className="h-4 w-4 text-cyan-300" />
        <h2 className="font-bold text-white">Install PWA</h2>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-300">
        Install this studio on phone or desktop for a full-screen app-like demo.
      </p>

      <button
        onClick={handleInstallClick}
        disabled={!promptEvent}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        <Download className="h-4 w-4" />
        {promptEvent ? "Install App" : "Install prompt preparing"}
      </button>

      {!promptEvent ? (
        <div className="mt-3 flex gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
          <p>
            For best testing, run a production build with{" "}
            <span className="font-bold text-slate-200">npm run build</span> and{" "}
            <span className="font-bold text-slate-200">npm run start</span>.
          </p>
        </div>
      ) : null}
    </div>
  );
}

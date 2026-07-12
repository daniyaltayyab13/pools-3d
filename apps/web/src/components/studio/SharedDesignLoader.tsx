"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getSavedDesign } from "@/lib/apiClient";
import { usePoolStore } from "@/store/usePoolStore";

type LoadStatus = "loading" | "success" | "error";

/**
 * SharedDesignLoader loads a saved design from the backend
 * and applies it to the live studio state.
 *
 * Used by:
 * /studio/design/[id]
 */
export function SharedDesignLoader({ designId }: { designId: string }) {
  const setDesignConfig = usePoolStore((state) => state.setDesignConfig);

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [message, setMessage] = useState("Loading shared pool design...");

  useEffect(() => {
    let isMounted = true;

    async function loadSharedDesign() {
      try {
        setStatus("loading");
        setMessage("Loading shared pool design...");

        const result = await getSavedDesign(designId);

        if (!isMounted) {
          return;
        }

        setDesignConfig({
          dimensions: result.data.config.dimensions,
          materials: result.data.config.materials,
        });

        setStatus("success");
        setMessage(
          `${result.data.name ?? "Shared design"} loaded into studio.`
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load shared design."
        );
      }
    }

    loadSharedDesign();

    return () => {
      isMounted = false;
    };
  }, [designId, setDesignConfig]);

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-[min(520px,calc(100vw-32px))] -translate-x-1/2">
      <div
        className={`rounded-2xl border p-4 shadow-2xl backdrop-blur ${
          status === "success"
            ? "border-emerald-400/30 bg-emerald-950/85"
            : status === "error"
              ? "border-red-400/30 bg-red-950/85"
              : "border-white/10 bg-slate-950/90"
        }`}
      >
        <div className="flex items-start gap-3">
          {status === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          ) : status === "error" ? (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          ) : (
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-cyan-300" />
          )}

          <div>
            <p className="font-bold text-white">
              {status === "success"
                ? "Shared Design Loaded"
                : status === "error"
                  ? "Shared Design Failed"
                  : "Loading Shared Design"}
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-300">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { CheckCircle2, Send, XCircle } from "lucide-react";
import { useState } from "react";
import {
  createDesignPreview,
  type DesignPreviewResponse,
} from "@/lib/apiClient";
import { usePoolStore } from "@/store/usePoolStore";

/**
 * DesignPreviewApiCard sends the current live pool design to the backend.
 *
 * This proves:
 * - frontend can serialize current design
 * - backend validates the design
 * - backend returns useful computed summary
 */
export function DesignPreviewApiCard() {
  const dimensions = usePoolStore((state) => state.dimensions);
  const materials = usePoolStore((state) => state.materials);

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [message, setMessage] = useState(
    "Current design has not been sent yet."
  );

  const [preview, setPreview] = useState<DesignPreviewResponse | null>(null);

  const handleSendDesign = async () => {
    try {
      setStatus("loading");
      setPreview(null);
      setMessage("Sending current pool design to backend...");

      const result = await createDesignPreview({
        version: 1,
        shape: "rectangular",
        dimensions,
        materials,
        source: "studio",
      });

      setStatus("success");
      setPreview(result.data);
      setMessage("Backend accepted and validated this design.");
    } catch (error) {
      setStatus("error");
      setPreview(null);
      setMessage(
        error instanceof Error ? error.message : "Could not send design."
      );
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-cyan-300" />
          <h2 className="font-bold text-white">Design API</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Send current pool config to Node backend
        </p>
      </div>

      <div
        className={`rounded-xl border p-3 ${
          status === "success"
            ? "border-emerald-400/30 bg-emerald-400/10"
            : status === "error"
              ? "border-red-400/30 bg-red-400/10"
              : "border-white/10 bg-black/20"
        }`}
      >
        <div className="flex items-start gap-3">
          {status === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          ) : status === "error" ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          ) : (
            <Send className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              {status === "success"
                ? "Design accepted"
                : status === "error"
                  ? "Design failed"
                  : status === "loading"
                    ? "Sending..."
                    : "Not sent"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">{message}</p>

            {preview ? (
              <div className="mt-3 space-y-2 rounded-xl bg-black/20 p-3 text-xs leading-5 text-slate-300">
                <p>
                  <span className="font-bold text-white">Preview ID:</span>{" "}
                  {preview.previewId.slice(0, 8)}...
                </p>
                <p>
                  <span className="font-bold text-white">Size:</span>{" "}
                  {preview.summary.dimensionsLabel}
                </p>
                <p>
                  <span className="font-bold text-white">Water Area:</span>{" "}
                  {preview.summary.waterSurfaceAreaSqm} m²
                </p>
                <p>
                  <span className="font-bold text-white">Approx Volume:</span>{" "}
                  {preview.summary.approximateWaterVolumeCbm} m³
                </p>
                <p>
                  <span className="font-bold text-white">iPhone AR:</span>{" "}
                  {preview.ar.iPhoneQuickLook}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSendDesign}
        disabled={status === "loading"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:bg-slate-700 disabled:text-slate-400"
      >
        <Send className="h-4 w-4" />
        {status === "loading" ? "Sending Design..." : "Send Design to Backend"}
      </button>
    </section>
  );
}

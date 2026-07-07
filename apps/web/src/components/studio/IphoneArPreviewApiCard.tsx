"use client";

import { Apple, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { useState } from "react";
import {
  createIphoneArPreview,
  type IphoneArPreviewResponse,
} from "@/lib/apiClient";
import { usePoolStore } from "@/store/usePoolStore";

/**
 * iPhone AR Preview API card.
 *
 * This card proves the frontend can send the current pool design
 * to the Node backend and receive iPhone Quick Look USDZ info.
 */
export function IphoneArPreviewApiCard() {
  const dimensions = usePoolStore((state) => state.dimensions);
  const materials = usePoolStore((state) => state.materials);

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [message, setMessage] = useState(
    "iPhone AR preview has not been requested yet."
  );

  const [preview, setPreview] = useState<IphoneArPreviewResponse | null>(null);

  const handleCreatePreview = async () => {
    try {
      setStatus("loading");
      setPreview(null);
      setMessage("Requesting iPhone AR preview from backend...");

      const result = await createIphoneArPreview({
        version: 1,
        shape: "rectangular",
        dimensions,
        materials,
        source: "studio",
      });

      setStatus("success");
      setPreview(result.data);
      setMessage("Backend returned iPhone Quick Look preview information.");
    } catch (error) {
      setStatus("error");
      setPreview(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create iPhone AR preview."
      );
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Apple className="h-4 w-4 text-slate-200" />
          <h2 className="font-bold text-white">iPhone AR API</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Request iPhone Quick Look preview from Node backend
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
            <Apple className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              {status === "success"
                ? "iPhone preview ready"
                : status === "error"
                  ? "iPhone preview failed"
                  : status === "loading"
                    ? "Requesting..."
                    : "Not requested"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">{message}</p>

            {preview ? (
              <div className="mt-3 space-y-2 rounded-xl bg-black/20 p-3 text-xs leading-5 text-slate-300">
                <p>
                  <span className="font-bold text-white">Preview ID:</span>{" "}
                  {preview.previewId.slice(0, 8)}...
                </p>

                <p>
                  <span className="font-bold text-white">Mode:</span>{" "}
                  {preview.mode}
                </p>

                <p>
                  <span className="font-bold text-white">Status:</span>{" "}
                  {preview.quickLook.status}
                </p>

                <p className="break-all">
                  <span className="font-bold text-white">USDZ:</span>{" "}
                  {preview.quickLook.href}
                </p>

                <p>
                  <span className="font-bold text-white">Next:</span>{" "}
                  {preview.pipeline.currentStep}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreatePreview}
        disabled={status === "loading"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:cursor-wait disabled:bg-slate-700 disabled:text-slate-400"
      >
        <Apple className="h-4 w-4" />
        {status === "loading" ? "Requesting..." : "Create iPhone AR Preview"}
      </button>

      {preview ? (
        <a
          href={preview.quickLook.href}
          rel="ar"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
        >
          <ExternalLink className="h-4 w-4" />
          Open USDZ Preview
        </a>
      ) : null}
    </section>
  );
}

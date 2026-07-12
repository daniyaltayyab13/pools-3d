"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Save,
  XCircle,
} from "lucide-react";

import { saveDesign, type SavedDesignResponse } from "@/lib/apiClient";
import { usePoolStore } from "@/store/usePoolStore";

/**
 * SaveDesignApiCard persists the current pool design to Postgres.
 *
 * This is the first MVP database-backed feature.
 */
export function SaveDesignApiCard() {
  const dimensions = usePoolStore((state) => state.dimensions);
  const materials = usePoolStore((state) => state.materials);

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [message, setMessage] = useState("Current design has not been saved.");

  const [savedDesign, setSavedDesign] = useState<SavedDesignResponse | null>(
    null
  );

  const handleSaveDesign = async () => {
    try {
      setStatus("loading");
      setSavedDesign(null);
      setMessage("Saving current pool design to database...");

      const result = await saveDesign({
        name: `Pool ${dimensions.length.toFixed(1)}m × ${dimensions.width.toFixed(
          1
        )}m`,
        version: 1,
        shape: "rectangular",
        dimensions,
        materials,
        source: "studio",
      });

      setStatus("success");
      setSavedDesign(result.data);
      setMessage("Design saved to database.");
    } catch (error) {
      setStatus("error");
      setSavedDesign(null);
      setMessage(
        error instanceof Error ? error.message : "Could not save design."
      );
    }
  };

  const handleCopyShareLink = async () => {
    if (!savedDesign) {
      return;
    }

    await navigator.clipboard.writeText(savedDesign.futureShareUrl);
    setMessage("Share link copied to clipboard.");
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-300" />
          <h2 className="font-bold text-white">Save Design</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Save current pool config to Postgres
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
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              {status === "success"
                ? "Saved"
                : status === "error"
                  ? "Save failed"
                  : status === "loading"
                    ? "Saving..."
                    : "Not saved"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">{message}</p>

            {savedDesign ? (
              <div className="mt-3 space-y-2 rounded-xl bg-black/20 p-3 text-xs leading-5 text-slate-300">
                <p>
                  <span className="font-bold text-white">Design ID:</span>{" "}
                  {savedDesign.id.slice(0, 8)}...
                </p>

                <p>
                  <span className="font-bold text-white">Name:</span>{" "}
                  {savedDesign.name}
                </p>

                <p>
                  <span className="font-bold text-white">Size:</span>{" "}
                  {savedDesign.summary.dimensionsLabel}
                </p>

                <p>
                  <span className="font-bold text-white">Saved:</span>{" "}
                  {new Date(savedDesign.createdAt).toLocaleTimeString()}
                </p>
                <p className="break-all">
                  <span className="font-bold text-white">Share:</span>{" "}
                  {savedDesign.futureShareUrl}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-slate-200"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link
                  </button>

                  <a
                    href={savedDesign.futureSharePath}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white transition hover:bg-white/[0.08]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSaveDesign}
        disabled={status === "loading"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:bg-slate-700 disabled:text-slate-400"
      >
        <Save className="h-4 w-4" />
        {status === "loading" ? "Saving..." : "Save Current Design"}
      </button>
    </section>
  );
}
